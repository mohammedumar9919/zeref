import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "../..");

const agentRuntime = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/agent-runtime.ts")).href
);
const grants = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/confirm-grants.ts")).href
);
const eventBus = await import(
  pathToFileURL(join(webRoot, "lib/cockpit/cockpit-event-bus.ts")).href
);
const { resetMemoryAdapterCache } = await import("@zeref/zeref-memory");

const { runJarvisAgent } = agentRuntime;
const {
  CONFIRM_EXPIRED_REPLY,
  CONFIRM_GRANT_TTL_MS,
  recordConfirmGrant,
  takeConfirmGrant,
  resetConfirmGrantsForTests,
} = grants;
const { resetCockpitEventBusForTests } = eventBus;

const ENV_KEYS = [
  "ZEREF_PHASE11_AGENT",
  "ZEREF_LLM_MOCK",
  "ZEREF_BFF_FIXTURE",
  "ZEREF_MEMORY_MOCK",
  "ZEREF_JOB_ENQUEUE_MOCK",
];

function assertExpired(result) {
  assert.equal(result.terminalReason, "completed");
  assert.equal(result.resultText, CONFIRM_EXPIRED_REPLY);
  assert.equal(result.pendingConfirm, undefined);
  assert.equal(result.toolCalls.length, 0);
}

describe("confirm grant store (K1)", () => {
  beforeEach(() => resetConfirmGrantsForTests());

  it("take returns the grant once, then nothing", () => {
    recordConfirmGrant({ runId: "r1", toolName: "enqueue_job", argsHash: "h1" });
    assert.deepEqual(takeConfirmGrant("r1"), {
      runId: "r1",
      toolName: "enqueue_job",
      argsHash: "h1",
    });
    assert.equal(takeConfirmGrant("r1"), undefined);
  });

  it("expired grants are not returned", () => {
    const createdAt = Date.now() - CONFIRM_GRANT_TTL_MS - 1;
    recordConfirmGrant({ runId: "r2", toolName: "enqueue_job", argsHash: "h2" }, createdAt);
    assert.equal(takeConfirmGrant("r2"), undefined);
  });

  it("unknown runId returns nothing", () => {
    assert.equal(takeConfirmGrant("nope"), undefined);
  });
});

describe("jarvis confirm flow with single-use grants (K1)", () => {
  before(() => {
    for (const key of ENV_KEYS) process.env[key] = "1";
    delete process.env.DATABASE_URL;
    delete process.env.OPENROUTER_API_KEY;
    resetMemoryAdapterCache();
    resetCockpitEventBusForTests();
  });

  beforeEach(() => resetConfirmGrantsForTests());

  after(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    resetConfirmGrantsForTests();
    resetMemoryAdapterCache();
    resetCockpitEventBusForTests();
  });

  it("enqueue → awaiting_confirm → confirm with runId enqueues; replay is refused", async () => {
    const blocked = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "enqueue a report job",
    });
    assert.equal(blocked.terminalReason, "awaiting_confirm");
    assert.equal(blocked.pendingConfirm?.toolName, "enqueue_job");
    assert.equal(typeof blocked.pendingConfirm?.argsHash, "string");

    const confirmed = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "enqueue a report job",
      confirmed: true,
      runId: blocked.runId,
    });
    assert.equal(confirmed.runId, blocked.runId);
    assert.equal(confirmed.terminalReason, "completed");
    assert.equal(confirmed.resultText, "Job enqueued successfully.");
    assert.equal(confirmed.toolCalls.filter((c) => c.name === "enqueue_job").length, 1);

    const replay = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "enqueue a report job",
      confirmed: true,
      runId: blocked.runId,
    });
    assertExpired(replay);
  });

  it("confirm with an unknown runId gets the expired reply and runs nothing", async () => {
    const result = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "enqueue a report job",
      confirmed: true,
      runId: randomUUID(),
    });
    assertExpired(result);
  });

  it("confirm without a runId is refused the same way", async () => {
    const result = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "enqueue a report job",
      confirmed: true,
    });
    assertExpired(result);
  });

  it("confirm after the grant expired is refused", async () => {
    const blocked = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "enqueue a report job",
    });
    const pending = blocked.pendingConfirm;
    resetConfirmGrantsForTests();
    recordConfirmGrant(
      { runId: blocked.runId, toolName: pending.toolName, argsHash: pending.argsHash },
      Date.now() - CONFIRM_GRANT_TTL_MS - 1,
    );
    const result = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "enqueue a report job",
      confirmed: true,
      runId: blocked.runId,
    });
    assertExpired(result);
  });

  it("a grant for different args does not execute the write-high tool", async () => {
    const runId = randomUUID();
    recordConfirmGrant({ runId, toolName: "enqueue_job", argsHash: "not-the-real-hash" });
    const result = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "enqueue a report job",
      confirmed: true,
      runId,
    });
    assert.equal(result.toolCalls.length, 0);
    assert.equal(result.terminalReason, "awaiting_confirm");
  });
});
