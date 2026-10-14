import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "../..");
const repoRoot = join(webRoot, "../..");

const { runJarvisAgent } = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/agent-runtime.ts")).href
);
const { createJarvisLlmPort } = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/llm-port.ts")).href
);
const { resetCockpitEventBusForTests } = await import(
  pathToFileURL(join(webRoot, "lib/cockpit/cockpit-event-bus.ts")).href
);
const { getMemoryAdapter, resetMemoryAdapterCache } = await import("@zeref/zeref-memory");
const { ZEREF_TOOL_DESCRIPTORS } = await import("@zeref/jarvis-kernel");

const DAY = 86_400_000;
const ENV_KEYS = [
  "ZEREF_PHASE11_AGENT",
  "ZEREF_LLM_MOCK",
  "ZEREF_BFF_FIXTURE",
  "ZEREF_MEMORY_MOCK",
  "ZEREF_JOB_ENQUEUE_MOCK",
];

function run(transcript, extra = {}) {
  return runJarvisAgent({ turnId: randomUUID(), transcript, ...extra });
}

async function mockRoute(transcript) {
  const llm = createJarvisLlmPort();
  const result = await llm.predict({
    messages: [{ role: "user", content: transcript }],
    tools: ZEREF_TOOL_DESCRIPTORS,
  });
  return result.toolCall;
}

describe("jarvis memory lifecycle mock flow (CLOUD-C19b)", () => {
  before(() => {
    for (const key of ENV_KEYS) process.env[key] = "1";
    delete process.env.DATABASE_URL;
    delete process.env.OPENROUTER_API_KEY;
    resetMemoryAdapterCache();
    resetCockpitEventBusForTests();
  });

  after(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    resetMemoryAdapterCache();
    resetCockpitEventBusForTests();
  });

  it("golden eval transcripts keep their routing", async () => {
    const tasks = readFileSync(join(repoRoot, "eval/jarvis/golden-tasks.jsonl"), "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => JSON.parse(l));
    assert.ok(tasks.length >= 10);
    for (const task of tasks) {
      const call = await mockRoute(task.transcript);
      assert.equal(call?.name, task.expectedTool, task.id);
    }
  });

  it("mock routes replace / history / stale phrasings", async () => {
    assert.deepEqual(await mockRoute("replace 7pm posting with 9pm posting"), {
      name: "memory_supersede",
      args: { target: "7pm posting", content: "9pm posting" },
      id: "mock-tc-memory-supersede",
    });
    assert.deepEqual((await mockRoute("show me the history of my posting time")).args, {
      content: "posting time",
    });
    assert.deepEqual((await mockRoute("what's the history of that?")).args, {});
    assert.equal((await mockRoute("what's stale?")).name, "memory_propose_archive");
    assert.equal((await mockRoute("archive old memories")).name, "memory_propose_archive");
    assert.deepEqual((await mockRoute("anything stale older than 30 days?")).args, { olderThanDays: 30 });
    assert.equal(await mockRoute("delete all my memories"), undefined);
  });

  it("'replace X with Y' asks first naming old and new, then replaces after yes", async () => {
    await run("pin this: post reels at 7pm");

    const blocked = await run("replace post reels at 7pm with post reels at 9pm");
    assert.equal(blocked.terminalReason, "awaiting_confirm");
    assert.equal(blocked.pendingConfirm?.toolName, "memory_supersede");
    assert.equal(blocked.toolCalls.length, 0);
    assert.deepEqual(blocked.factCards, []);
    assert.equal(
      blocked.resultText,
      'Shall I replace "post reels at 7pm" with "post reels at 9pm"? Say yes to confirm.',
    );
    const adapter = await getMemoryAdapter();
    const pins = await adapter.listVaultItems({ kind: "pin" });
    assert.equal(pins.filter((p) => p.content === "post reels at 9pm").length, 0, "nothing written before yes");

    const confirmed = await run("replace post reels at 7pm with post reels at 9pm", {
      confirmed: true,
      runId: blocked.runId,
    });
    assert.equal(confirmed.terminalReason, "completed");
    const call = confirmed.toolCalls.find((c) => c.name === "memory_supersede");
    assert.equal(call.result.superseded, true);
    assert.equal(
      confirmed.resultText,
      'Replaced "post reels at 7pm" with "post reels at 9pm". The old version stays in history.',
    );
    assert.equal(confirmed.factCards[0].title, "Replaced");

    const replay = await run("replace post reels at 7pm with post reels at 9pm", {
      confirmed: true,
      runId: blocked.runId,
    });
    assert.equal(replay.toolCalls.length, 0);
    assert.match(replay.resultText, /confirmation has expired/);
  });

  it("history shows both versions with a Memory history card", async () => {
    const result = await run("show me the history of post reels");
    assert.equal(result.terminalReason, "completed");
    const call = result.toolCalls.find((c) => c.name === "memory_history");
    assert.ok(call, "expected memory_history");
    assert.deepEqual(
      call.result.versions.map((v) => [v.content, v.status]),
      [
        ["post reels at 7pm", "superseded"],
        ["post reels at 9pm", "current"],
      ],
    );
    assert.equal(
      result.resultText,
      'It\'s currently "post reels at 9pm"; earlier versions: "post reels at 7pm".',
    );
    assert.equal(result.factCards[0].title, "Memory history");
  });

  it("replace with no match: no confirm card, and a forced confirm runs nothing", async () => {
    const result = await run("replace my gym schedule with mornings");
    assert.equal(result.pendingConfirm, undefined);
    assert.equal(result.terminalReason, "completed");
    assert.match(result.resultText, /nothing to replace/);
    const forced = await run("replace my gym schedule with mornings", {
      confirmed: true,
      runId: result.runId,
    });
    assert.equal(forced.toolCalls.length, 0);
  });

  it("stale question proposes only; archive command asks with the list, then archives after yes", async () => {
    const adapter = await getMemoryAdapter();
    const old = new Date(Date.now() - 200 * DAY);
    await adapter.saveMemory({ content: "film the canal ride", source: "voice", tier: "episodic", createdAt: old });
    await adapter.saveMemory({ content: "try a slower hook", source: "voice", tier: "episodic", createdAt: old });

    const asked = await run("what memories are stale?");
    assert.equal(asked.terminalReason, "completed");
    assert.deepEqual(asked.toolCalls.map((c) => c.name), ["memory_propose_archive"]);
    const proposal = asked.toolCalls[0].result;
    const staleContents = proposal.items.map((i) => i.content);
    assert.ok(staleContents.includes("film the canal ride"));
    assert.ok(staleContents.includes("try a slower hook"));
    assert.ok(!staleContents.includes("post reels at 9pm"), "pins and fresh entries are not stale");
    assert.equal(asked.factCards[0].title, "Stale memories");
    assert.match(asked.resultText, new RegExp(`^${proposal.count} memories look stale older than 90 days`));

    const blocked = await run("archive old memories");
    assert.equal(blocked.terminalReason, "awaiting_confirm");
    assert.equal(blocked.pendingConfirm?.toolName, "memory_archive");
    assert.deepEqual(blocked.pendingConfirm.args.ids, proposal.ids);
    assert.equal(blocked.toolCalls.some((c) => c.name === "memory_archive"), false);
    const shown = staleContents.slice(0, 5).map((c) => `"${c}"`).join(", ");
    const more = staleContents.length > 5 ? ` and ${staleContents.length - 5} more` : "";
    assert.equal(
      blocked.resultText,
      `Shall I archive ${proposal.count} old memories: ${shown}${more}? Nothing is deleted. Say yes to confirm.`,
    );
    const stillVisible = await adapter.searchMemory("film the canal ride");
    assert.equal(stillVisible.results.length, 1, "nothing archived before yes");

    const confirmed = await run("archive old memories", { confirmed: true, runId: blocked.runId });
    assert.equal(confirmed.terminalReason, "completed");
    const archive = confirmed.toolCalls.find((c) => c.name === "memory_archive");
    assert.deepEqual([...archive.result.archived].sort(), [...proposal.ids].sort());
    assert.equal(archive.result.archivedCount, proposal.count);
    assert.match(confirmed.resultText, new RegExp(`^Archived ${proposal.count} memories: .*Nothing was deleted\\.$`));
    assert.ok(confirmed.factCards.some((c) => c.title === `Archived ${proposal.count}`));

    const hidden = await adapter.searchMemory("film the canal ride");
    assert.equal(hidden.results.length, 0);
    const kept = await adapter.searchMemory("film the canal ride", { includeArchived: true });
    assert.equal(kept.results.length, 1, "archived, not deleted");

    const nothingLeft = await run("archive old memories");
    assert.equal(nothingLeft.pendingConfirm, undefined);
    assert.match(nothingLeft.resultText, /Nothing stale/);
  });

  it("if the stale set changes before yes, nothing is archived", async () => {
    const adapter = await getMemoryAdapter();
    const old = new Date(Date.now() - 300 * DAY);
    await adapter.saveMemory({ content: "first stale note", source: "voice", tier: "episodic", createdAt: old });
    const blocked = await run("archive old memories");
    assert.equal(blocked.pendingConfirm?.toolName, "memory_archive");

    await adapter.saveMemory({ content: "second stale note", source: "voice", tier: "episodic", createdAt: old });
    const confirmed = await run("archive old memories", { confirmed: true, runId: blocked.runId });
    assert.equal(confirmed.toolCalls.some((c) => c.name === "memory_archive"), false);
    assert.equal(confirmed.terminalReason, "awaiting_confirm");
    assert.equal((await adapter.searchMemory("first stale note")).results.length, 1);
  });
});
