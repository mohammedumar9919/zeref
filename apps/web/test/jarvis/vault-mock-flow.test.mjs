import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "../..");

const agentRuntime = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/agent-runtime.ts")).href
);
const eventBus = await import(
  pathToFileURL(join(webRoot, "lib/cockpit/cockpit-event-bus.ts")).href
);
const { resetMemoryAdapterCache } = await import("@zeref/zeref-memory");

const { runJarvisAgent } = agentRuntime;
const { resetCockpitEventBusForTests } = eventBus;

const ENV_KEYS = [
  "ZEREF_PHASE11_AGENT",
  "ZEREF_LLM_MOCK",
  "ZEREF_BFF_FIXTURE",
  "ZEREF_MEMORY_MOCK",
  "ZEREF_JOB_ENQUEUE_MOCK",
];

describe("jarvis vault mock flow (CLOUD-C3)", () => {
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

  it("'pin this' routes to vault_pin, then 'what have you pinned' lists it", async () => {
    const pinned = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "pin this: post reels at 7pm",
    });
    assert.equal(pinned.terminalReason, "completed");
    const pinCall = pinned.toolCalls.find((c) => c.name === "vault_pin");
    assert.ok(pinCall, "expected vault_pin");
    assert.equal(pinCall.args.content, "post reels at 7pm");
    assert.equal(pinCall.result.item.kind, "pin");

    const listed = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "what have you pinned",
    });
    assert.equal(listed.terminalReason, "completed");
    const listCall = listed.toolCalls.find((c) => c.name === "vault_list");
    assert.ok(listCall, "expected vault_list");
    assert.match(JSON.stringify(listCall.result), /post reels at 7pm/);
    assert.equal(pinned.resultText, 'Pinned: "post reels at 7pm".');
    assert.match(listed.resultText, /post reels at 7pm/);
  });

  it("a question about pins lists instead of pinning the question", async () => {
    const asked = await runJarvisAgent({ turnId: randomUUID(), transcript: "what did you pin" });
    assert.ok(asked.toolCalls.find((c) => c.name === "vault_list"));
    assert.equal(asked.toolCalls.find((c) => c.name === "vault_pin"), undefined);
  });

  it("pinning the same thing twice keeps one copy", async () => {
    const again = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "pin this: Post reels at 7pm",
    });
    assert.equal(again.toolCalls[0].result.alreadyPinned, true);
    assert.match(again.resultText, /already pinned/);
    const listed = await runJarvisAgent({ turnId: randomUUID(), transcript: "what have you pinned" });
    const contents = listed.toolCalls[0].result.items.map((i) => i.content.toLowerCase());
    assert.equal(contents.filter((c) => c === "post reels at 7pm").length, 1);
  });

  it("'forget that' is confirm-gated, then deletes the latest pin", async () => {
    const blocked = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "forget that",
    });
    assert.equal(blocked.terminalReason, "awaiting_confirm");
    assert.equal(blocked.pendingConfirm?.toolName, "vault_forget");
    assert.equal(blocked.toolCalls.length, 0);
    assert.equal(blocked.resultText, 'Shall I forget "post reels at 7pm"?');

    const confirmed = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "forget that",
      confirmed: true,
      runId: blocked.runId,
    });
    assert.equal(confirmed.terminalReason, "completed");
    const forgetCall = confirmed.toolCalls.find((c) => c.name === "vault_forget");
    assert.ok(forgetCall, "expected vault_forget");
    assert.equal(forgetCall.result.deleted, true);
    assert.equal(confirmed.resultText, 'Forgotten: "post reels at 7pm".');

    const listed = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "what have you pinned",
    });
    const listCall = listed.toolCalls.find((c) => c.name === "vault_list");
    assert.doesNotMatch(JSON.stringify(listCall.result), /post reels at 7pm/);
  });

  it("forget with an empty vault says so without a confirm card", async () => {
    const empty = await runJarvisAgent({ turnId: randomUUID(), transcript: "forget that" });
    assert.equal(empty.pendingConfirm, undefined);
    assert.equal(empty.terminalReason, "completed");
    assert.match(empty.resultText, /nothing to forget/);

    const forcedConfirm = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "forget that",
      confirmed: true,
      runId: empty.runId,
    });
    assert.equal(forcedConfirm.toolCalls.length, 0);
    assert.match(forcedConfirm.resultText, /confirmation has expired/);
  });
});
