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

const COLLECT_TRANSCRIPT = "collect latest instagram data";

function ask(transcript, extra = {}) {
  return runJarvisAgent({ turnId: randomUUID(), transcript, ...extra });
}

describe("jarvis collect routing (CLOUD-C2)", () => {
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

  it("collect request stops at the write-high confirm with jobType collect", async () => {
    const result = await ask(COLLECT_TRANSCRIPT);
    assert.equal(result.terminalReason, "awaiting_confirm");
    assert.equal(result.pendingConfirm?.toolName, "enqueue_job");
    assert.equal(result.pendingConfirm?.args?.jobType, "collect");
    assert.equal(result.resultText, "Shall I collect your latest Instagram data? Say yes to confirm.");
    assert.equal(result.toolCalls.length, 0, "nothing executes before Confirm");
  });

  it("refresh data phrasing also routes to collect", async () => {
    const result = await ask("refresh my data");
    assert.equal(result.pendingConfirm?.toolName, "enqueue_job");
    assert.equal(result.pendingConfirm?.args?.jobType, "collect");
  });

  it("confirmed collect runs and reports the simulated demo answer", async () => {
    const pending = await ask(COLLECT_TRANSCRIPT);
    const result = await ask(COLLECT_TRANSCRIPT, { confirmed: true, runId: pending.runId });
    assert.equal(result.terminalReason, "completed");
    const call = result.toolCalls.find((c) => c.name === "enqueue_job");
    assert.ok(call, "expected enqueue_job to execute after Confirm");
    assert.equal(call.args.jobType, "collect");
    assert.equal(call.result?.mocked, true);
    assert.equal(result.resultText, "Collect queued — simulated in demo mode.");
  });

  it("enqueue a report job still routes to jobType report", async () => {
    const result = await ask("enqueue a report job");
    assert.equal(result.terminalReason, "awaiting_confirm");
    assert.equal(result.pendingConfirm?.args?.jobType, "report");
    assert.equal(result.resultText, "Shall I queue a report job? Say yes to confirm.");
  });

  it("confirmed report job keeps the generic enqueue answer", async () => {
    const pending = await ask("enqueue a report job");
    const result = await ask("enqueue a report job", { confirmed: true, runId: pending.runId });
    assert.equal(result.resultText, "Job enqueued successfully.");
  });

  it("delete-all with 'data' is still refused, never collected", async () => {
    const result = await ask("delete all my data");
    assert.equal(result.toolCalls.length, 0);
    assert.equal(result.pendingConfirm, undefined);
  });
});
