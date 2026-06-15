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

const { runJarvisAgent } = agentRuntime;
const { getCockpitEventBus, resetCockpitEventBusForTests } = eventBus;

function setAgentTestEnv() {
  process.env.ZEREF_PHASE11_AGENT = "1";
  process.env.ZEREF_LLM_MOCK = "1";
  process.env.ZEREF_BFF_FIXTURE = "1";
  process.env.ZEREF_MEMORY_MOCK = "1";
  process.env.ZEREF_JOB_ENQUEUE_MOCK = "1";
  delete process.env.DATABASE_URL;
  delete process.env.OPENROUTER_API_KEY;
}

function clearAgentTestEnv() {
  delete process.env.ZEREF_PHASE11_AGENT;
  delete process.env.ZEREF_LLM_MOCK;
  delete process.env.ZEREF_BFF_FIXTURE;
  delete process.env.ZEREF_MEMORY_MOCK;
  delete process.env.ZEREF_JOB_ENQUEUE_MOCK;
}

describe("jarvis agent runtime (P11-C)", () => {
  before(() => {
    setAgentTestEnv();
    resetCockpitEventBusForTests();
  });

  after(() => {
    clearAgentTestEnv();
    resetCockpitEventBusForTests();
  });

  it("completes a cockpit read turn under mock ports", async () => {
    const turnId = randomUUID();
    const steps = [];
    getCockpitEventBus().subscribe((type, data) => {
      if (type === "agent.step") {
        steps.push(data);
      }
    });

    const result = await runJarvisAgent({
      turnId,
      transcript: "Show me the cockpit dashboard",
    });

    assert.equal(result.terminalReason, "completed");
    assert.ok(result.resultText.length > 0);
    assert.ok(result.toolCalls.some((c) => c.name === "get_cockpit_summary"));
    assert.ok(steps.length > 0);
    assert.equal(steps[0].type, "tool_call");
  });

  it("maps agent steps to contract shape on the event bus", async () => {
    const turnId = randomUUID();
    const agentSteps = [];

    getCockpitEventBus().subscribe((type, data) => {
      if (type === "agent.step") {
        agentSteps.push(data);
      }
    });

    await runJarvisAgent({
      turnId,
      transcript: "What's the latest report headline?",
    });

    const types = agentSteps.map((s) => s.type);
    assert.ok(types.includes("tool_call"));
    assert.ok(types.includes("tool_result"));
    assert.ok(types.includes("completed"));
  });

  it("asks for confirm before write-high enqueue", async () => {
    const turnId = randomUUID();

    const blocked = await runJarvisAgent({
      turnId,
      transcript: "Please enqueue a report job",
    });

    assert.equal(blocked.terminalReason, "awaiting_confirm");
    assert.match(blocked.resultText, /Shall I proceed/i);
    assert.equal(blocked.toolCalls.length, 0);
    assert.ok(blocked.pendingConfirm);
    assert.equal(blocked.pendingConfirm.toolName, "enqueue_job");
  });

  it("executes write-high after confirmed resume", async () => {
    const turnId = randomUUID();
    const runId = randomUUID();

    const resumed = await runJarvisAgent({
      turnId,
      transcript: "Please enqueue a report job",
      confirmed: true,
      runId,
    });

    assert.equal(resumed.terminalReason, "completed");
    assert.ok(
      resumed.toolCalls.some((c) => c.name === "enqueue_job"),
      "expected enqueue_job in toolCalls",
    );
  });
});
