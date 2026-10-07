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

function ask(transcript) {
  return runJarvisAgent({ turnId: randomUUID(), transcript });
}

describe("jarvis mock answers from tool results (CLOUD-D2)", () => {
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

  it("headline answer quotes the saved report headline", async () => {
    const result = await ask("what is the latest report headline");
    assert.equal(result.terminalReason, "completed");
    assert.match(
      result.resultText,
      /Ride log post shows solid engagement vs account baseline\./,
    );
  });

  it("memory recall lists what was saved", async () => {
    await ask("remember this for later: film the canal ride on Sunday");
    const result = await ask("what did I ask you to remember");
    assert.equal(result.terminalReason, "completed");
    const call = result.toolCalls.find((c) => c.name === "memory_search");
    assert.ok(call, "expected memory_search");
    assert.match(result.resultText, /^Here's what you've asked me to remember: /);
    assert.match(result.resultText, /film the canal ride on Sunday/);
  });

  it("post vs usual reports score, baseline and low confidence", async () => {
    const result = await ask("how did my last post do compared to my usual");
    assert.equal(result.terminalReason, "completed");
    const call = result.toolCalls.find((c) => c.name === "get_report_artifact");
    assert.ok(call, "expected get_report_artifact");
    assert.match(result.resultText, /scored 50\.7 for engagement/);
    assert.match(result.resultText, /in line with your usual/);
    assert.match(result.resultText, /Low confidence — not enough history yet/);
  });

  it("delete-all is refused with no tool and no confirm", async () => {
    const result = await ask("delete all my data");
    assert.equal(result.terminalReason, "completed");
    assert.equal(result.toolCalls.length, 0);
    assert.equal(result.pendingConfirm, undefined);
    assert.match(result.resultText, /can't delete all your data/);
    assert.match(result.resultText, /forget a specific item/);
  });

  it("enqueue confirm uses the plain-English label", async () => {
    const result = await ask("enqueue a report job");
    assert.equal(result.terminalReason, "awaiting_confirm");
    assert.equal(result.resultText, "Shall I queue a report job? Say yes to confirm.");
  });

  it("unrecognised input gets capability help, not an echo", async () => {
    const result = await ask("sing me a sea shanty");
    assert.equal(result.toolCalls.length, 0);
    assert.doesNotMatch(result.resultText, /I heard/);
    assert.match(result.resultText, /I can read your latest report headline/);
  });
});
