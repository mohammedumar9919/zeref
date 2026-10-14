import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const kernel = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);
const { MockMemoryAdapter } = await import("@zeref/zeref-memory");

const {
  ZEREF_TOOL_DESCRIPTORS,
  createZerefToolExecutor,
  runAgentLoop,
  confirmPrompt,
  describeMemoryArchive,
  describeMemorySupersede,
  resolveMemoryTarget,
} = kernel;

const DAY = 86_400_000;

function tierOf(name) {
  return ZEREF_TOOL_DESCRIPTORS.find((t) => t.name === name)?.riskTier;
}

function stubContext() {
  return {
    read: { canRead: () => true, unavailableMessage: (tool) => `${tool} unavailable` },
    write: {},
  };
}

/** Lifecycle port over a mock adapter that counts every mutating call. */
function lifecyclePortFrom(adapter) {
  const calls = { supersede: 0, archive: 0, forget: 0 };
  const port = {
    searchEntries: async (query, opts) =>
      (await adapter.searchMemory(query, { limit: opts?.limit })).results.map((r) => r.entry),
    listVaultItems: (opts) => adapter.listVaultItems(opts),
    getEntryHistory: (id) => adapter.getEntryHistory(id),
    proposeStaleArchive: (opts) => adapter.proposeStaleArchive(opts),
    supersedeEntry: (oldId, input) => {
      calls.supersede += 1;
      return adapter.supersedeEntry(oldId, input);
    },
    archiveEntries: (ids) => {
      calls.archive += 1;
      return adapter.archiveEntries(ids);
    },
  };
  return { port, calls };
}

function vaultPortFrom(adapter) {
  return {
    saveVaultItem: (input) => adapter.saveVaultItem(input),
    listVaultItems: (opts) => adapter.listVaultItems(opts),
    forgetVaultItem: (id) => adapter.forgetVaultItem(id),
  };
}

function scriptedLlm(calls) {
  let i = 0;
  return {
    async predict() {
      const call = calls[i];
      i += 1;
      if (call) return { toolCall: call, tokensUsed: 1 };
      return { text: "Done.", tokensUsed: 1 };
    },
  };
}

async function setup() {
  const adapter = new MockMemoryAdapter(false);
  const { port, calls } = lifecyclePortFrom(adapter);
  const executor = createZerefToolExecutor(stubContext(), {
    lifecycle: port,
    vault: vaultPortFrom(adapter),
  });
  return { adapter, port, calls, executor };
}

async function saveOld(adapter, content, daysAgo) {
  const { entry } = await adapter.saveMemory({
    content,
    source: "voice",
    tier: "episodic",
    createdAt: new Date(Date.now() - daysAgo * DAY),
  });
  return entry;
}

async function runGated({ runId, executor, call, grant }) {
  return runAgentLoop({
    runId,
    transcript: "test",
    llm: scriptedLlm([call]),
    toolExecutor: executor,
    tools: ZEREF_TOOL_DESCRIPTORS,
    ...(grant ? { confirmGrant: grant } : {}),
  });
}

describe("@zeref/jarvis-kernel memory lifecycle tools (CLOUD-C19b)", () => {
  it("tiers: history and propose are read; supersede and archive are write-high", () => {
    assert.equal(tierOf("memory_history"), "read");
    assert.equal(tierOf("memory_propose_archive"), "read");
    assert.equal(tierOf("memory_supersede"), "write-high");
    assert.equal(tierOf("memory_archive"), "write-high");
    assert.equal(tierOf("vault_forget"), "write-high");
  });

  it("memory_supersede does not execute before confirm, then replaces after it", async () => {
    const { adapter, calls, executor } = await setup();
    const pin = await adapter.saveVaultItem({ kind: "pin", content: "post reels at 7pm" });
    const call = {
      name: "memory_supersede",
      args: { target: "7pm", content: "post reels at 9pm" },
      id: "tc-sup",
    };

    const blocked = await runGated({ runId: "run-sup-1", executor, call });
    assert.equal(blocked.terminalReason, "awaiting_confirm");
    assert.equal(blocked.pendingConfirm.toolName, "memory_supersede");
    assert.equal(blocked.steps.some((s) => s.type === "tool_execute"), false);
    assert.equal(calls.supersede, 0);
    assert.equal((await adapter.getEntryHistory(pin.id)).length, 1);

    const wrongArgs = await runGated({
      runId: "run-sup-1",
      executor,
      call: { ...call, args: { target: "7pm", content: "something else" } },
      grant: { runId: "run-sup-1", toolName: "memory_supersede", argsHash: blocked.pendingConfirm.argsHash },
    });
    assert.equal(wrongArgs.terminalReason, "awaiting_confirm");
    assert.equal(calls.supersede, 0);

    const confirmed = await runGated({
      runId: "run-sup-1",
      executor,
      call,
      grant: { runId: "run-sup-1", toolName: "memory_supersede", argsHash: blocked.pendingConfirm.argsHash },
    });
    assert.equal(confirmed.terminalReason, "completed");
    const exec = confirmed.steps.find((s) => s.type === "tool_execute");
    assert.equal(exec.ok, true);
    assert.equal(exec.result.superseded, true);
    assert.equal(exec.result.previous.content, "post reels at 7pm");
    assert.equal(exec.result.entry.content, "post reels at 9pm");
    assert.equal(calls.supersede, 1);

    const history = await adapter.getEntryHistory(pin.id);
    assert.deepEqual(
      history.map((e) => e.content),
      ["post reels at 7pm", "post reels at 9pm"],
    );
    assert.equal(history[0].supersededBy, history[1].id);
  });

  it("memory_archive does not execute before confirm, then archives exactly the confirmed ids", async () => {
    const { adapter, calls, executor } = await setup();
    const a = await saveOld(adapter, "old idea one", 200);
    const b = await saveOld(adapter, "old idea two", 150);
    const keep = await saveOld(adapter, "old idea three", 120);
    const call = { name: "memory_archive", args: { ids: [a.id, b.id] }, id: "tc-arc" };

    const blocked = await runGated({ runId: "run-arc-1", executor, call });
    assert.equal(blocked.terminalReason, "awaiting_confirm");
    assert.equal(calls.archive, 0);

    const confirmed = await runGated({
      runId: "run-arc-1",
      executor,
      call,
      grant: { runId: "run-arc-1", toolName: "memory_archive", argsHash: blocked.pendingConfirm.argsHash },
    });
    const exec = confirmed.steps.find((s) => s.type === "tool_execute");
    assert.equal(exec.ok, true);
    assert.deepEqual(exec.result.archived.sort(), [a.id, b.id].sort());
    assert.equal(exec.result.archivedCount, 2);
    assert.deepEqual(
      exec.result.items.map((i) => i.content).sort(),
      ["old idea one", "old idea two"],
    );

    const history = await adapter.getEntryHistory(keep.id);
    assert.equal(history[0].archivedAt, null);
    const stillThere = await adapter.searchMemory("old idea", { includeArchived: true, limit: 10 });
    assert.equal(stillThere.results.length, 3, "archive never deletes");
  });

  it("memory_archive without ids fails closed (no bulk archive)", async () => {
    const { adapter, calls, executor } = await setup();
    await saveOld(adapter, "old idea", 200);
    for (const args of [{}, { ids: [] }, { ids: "all" }, { olderThanDays: 1 }]) {
      const result = await executor.execute("memory_archive", args);
      assert.equal(result.ok, false);
    }
    assert.equal(calls.archive, 0);
  });

  it("memory_propose_archive is read-only and lists stale, unpinned entries", async () => {
    const { adapter, calls, executor } = await setup();
    const old = await saveOld(adapter, "stale caption idea", 200);
    await saveOld(adapter, "fresh caption idea", 2);
    await adapter.saveVaultItem({
      kind: "pin",
      content: "old pinned rule",
      createdAt: new Date(Date.now() - 300 * DAY),
    });

    const result = await executor.execute("memory_propose_archive", {});
    assert.equal(result.ok, true);
    assert.equal(result.data.olderThanDays, 90);
    assert.deepEqual(result.data.ids, [old.id]);
    assert.equal(result.data.count, 1);
    assert.equal(result.data.items[0].content, "stale caption idea");
    assert.equal(calls.archive + calls.supersede, 0);
    assert.equal((await adapter.getEntryHistory(old.id))[0].archivedAt, null);

    const narrow = await executor.execute("memory_propose_archive", { olderThanDays: 365 });
    assert.equal(narrow.data.count, 0);
  });

  it("memory_history resolves by content (including a superseded version) and by id", async () => {
    const { adapter, executor } = await setup();
    const pin = await adapter.saveVaultItem({ kind: "pin", content: "post reels at 7pm" });
    const { entry: replacement } = await adapter.supersedeEntry(pin.id, { content: "post reels at 9pm" });

    const byOld = await executor.execute("memory_history", { content: "7PM" });
    assert.equal(byOld.ok, true);
    assert.equal(byOld.data.found, true);
    assert.deepEqual(
      byOld.data.versions.map((v) => [v.content, v.status]),
      [
        ["post reels at 7pm", "superseded"],
        ["post reels at 9pm", "current"],
      ],
    );

    const byId = await executor.execute("memory_history", { id: replacement.id });
    assert.equal(byId.data.count, 2);

    const miss = await executor.execute("memory_history", { content: "nothing like this" });
    assert.equal(miss.data.found, false);
    assert.deepEqual(miss.data.versions, []);
  });

  it("supersede only targets current entries and refuses a no-op", async () => {
    const { adapter, port, calls, executor } = await setup();
    const pin = await adapter.saveVaultItem({ kind: "pin", content: "post reels at 7pm" });
    await adapter.supersedeEntry(pin.id, { content: "post reels at 9pm" });

    const target = await resolveMemoryTarget(port, {
      needle: "7pm",
      current: true,
      fallbackToLatestPin: false,
    });
    assert.equal(target, undefined, "superseded version is not a write target");

    const miss = await executor.execute("memory_supersede", { target: "7pm", content: "post reels at 8pm" });
    assert.equal(miss.data.superseded, false);
    const same = await executor.execute("memory_supersede", {
      target: "9pm",
      content: "Post reels at 9pm",
    });
    assert.equal(same.data.superseded, false);
    assert.equal(calls.supersede, 0);

    const blank = await executor.execute("memory_supersede", { target: "9pm", content: "  " });
    assert.equal(blank.ok, false);
  });

  it("confirm prompts name the exact old/new content and the items to archive", async () => {
    const { adapter, port } = await setup();
    await adapter.saveVaultItem({ kind: "pin", content: "post reels at 7pm" });
    const sup = await describeMemorySupersede(port, { target: "7pm", content: "post reels at 9pm" });
    assert.deepEqual(sup, {
      text: 'Shall I replace "post reels at 7pm" with "post reels at 9pm"? Say yes to confirm.',
      keepConfirm: true,
    });
    const supMiss = await describeMemorySupersede(port, { target: "nope", content: "x" });
    assert.equal(supMiss.keepConfirm, false);

    const a = await saveOld(adapter, "old idea one", 200);
    const b = await saveOld(adapter, "old idea two", 150);
    const arc = await describeMemoryArchive(port, { ids: [a.id, b.id] });
    assert.equal(arc.keepConfirm, true);
    assert.equal(
      arc.text,
      'Shall I archive 2 old memories: "old idea one", "old idea two"? Nothing is deleted. Say yes to confirm.',
    );
    await adapter.archiveEntries([a.id, b.id]);
    const arcNone = await describeMemoryArchive(port, { ids: [a.id, b.id] });
    assert.equal(arcNone.keepConfirm, false);
  });

  it("kernel labels follow the operator wording", () => {
    assert.equal(
      confirmPrompt("memory_supersede", { target: "7pm posting", content: "9pm posting" }),
      'Shall I replace "7pm posting" with "9pm posting"? Say yes to confirm.',
    );
    assert.equal(
      confirmPrompt("memory_archive", { ids: ["a", "b", "c"] }),
      "Shall I archive 3 old memories? Say yes to confirm.",
    );
  });

  it("unknown tools still fail closed", async () => {
    const { executor } = await setup();
    const result = await executor.execute("memory_delete", { id: "x" });
    assert.equal(result.ok, false);
    assert.match(result.error, /unknown tool/);

    const loop = await runAgentLoop({
      runId: "run-unknown",
      transcript: "delete my memory",
      llm: scriptedLlm([{ name: "memory_purge", args: {}, id: "tc-x" }]),
      toolExecutor: executor,
      tools: ZEREF_TOOL_DESCRIPTORS,
    });
    const exec = loop.steps.find((s) => s.type === "tool_execute");
    assert.equal(exec.ok, false);
    assert.equal(exec.error, "unknown_tool");
  });

  it("lifecycle adapter source has no delete path", () => {
    const src = readFileSync(
      join(pkgRoot, "src/zeref/adapters/memory-lifecycle-adapters.ts"),
      "utf8",
    );
    assert.doesNotMatch(src, /forgetVaultItem|\.delete\(|DELETE\b|deleteFrom/);
  });
});
