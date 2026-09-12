import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");
const repoRoot = join(webRoot, "../..");

const kernel = await import(
  pathToFileURL(join(repoRoot, "packages/jarvis-kernel/dist/index.js")).href
);
const bargeIn = await import(
  pathToFileURL(join(webRoot, "lib/voice/barge-in.ts")).href
);
const parseVoice = await import(
  pathToFileURL(join(webRoot, "lib/voice/parse-voice-events.ts")).href
);
const handleTurn = await import(
  pathToFileURL(join(webRoot, "lib/voice/handle-turn.ts")).href
);
const agentRuntime = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/agent-runtime.ts")).href
);
const llmPort = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/llm-port.ts")).href
);
const eventBus = await import(
  pathToFileURL(join(webRoot, "lib/cockpit/cockpit-event-bus.ts")).href
);

function setCiVoiceMockEnv() {
  process.env.ZEREF_WHISPER_MOCK = "1";
  process.env.ZEREF_TTS_MOCK = "1";
  process.env.ZEREF_LLM_MOCK = "1";
  process.env.ZEREF_BFF_FIXTURE = "1";
  process.env.ZEREF_PHASE11_AGENT = "1";
  delete process.env.OPENROUTER_API_KEY;
}

function setLiveVoiceMockEnv() {
  process.env.ZEREF_WHISPER_MOCK = "1";
  process.env.ZEREF_TTS_MOCK = "1";
  process.env.ZEREF_PHASE11_AGENT = "1";
  process.env.ZEREF_BFF_FIXTURE = "1";
  delete process.env.ZEREF_LLM_MOCK;
  delete process.env.OPENROUTER_API_KEY;
}

function clearVoiceEnv() {
  delete process.env.ZEREF_WHISPER_MOCK;
  delete process.env.ZEREF_TTS_MOCK;
  delete process.env.ZEREF_LLM_MOCK;
  delete process.env.ZEREF_BFF_FIXTURE;
  delete process.env.ZEREF_PHASE11_AGENT;
  delete process.env.OPENROUTER_API_KEY;
}

describe("CLOUD-A4 streaming voice lite", () => {
  after(() => {
    clearVoiceEnv();
    eventBus.resetCockpitEventBusForTests();
    handleTurn.resetPendingVoiceConfirmForTests();
  });

  it("documents first-audio target without claiming a laptop measurement", () => {
    assert.equal(kernel.FIRST_AUDIO_TARGET_MS, 1200);
  });

  it("cascades tokens into per-sentence mock TTS chunks", async () => {
    const synthesized = [];
    const result = await kernel.runTokenToTtsCascade({
      tokens: ["Alpha. ", "Bravo. ", "Charlie"],
      synthesize: async (sentence) => {
        synthesized.push(sentence);
        return sentence.length;
      },
    });
    assert.deepEqual(synthesized, ["Alpha.", "Bravo.", "Charlie"]);
    assert.equal(result.aborted, false);
    assert.equal(typeof result.firstAudioMs, "number");
  });

  it("keeps CI sync-mock 200 JSON path", async () => {
    setCiVoiceMockEnv();
    eventBus.resetCockpitEventBusForTests();
    const audio = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" });
    const response = await handleTurn.handleVoiceTurn(audio);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.mode, "sync-mock");
    assert.ok(body.ackAudio?.audioBase64);
    assert.ok(body.resultAudio?.audioBase64);
  });

  it("aborts an in-flight live run on barge-in", async () => {
    setLiveVoiceMockEnv();
    eventBus.resetCockpitEventBusForTests();

    const received = [];
    eventBus.getCockpitEventBus().subscribe((eventType, data) => {
      received.push({ eventType, data });
    });

    const audio = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/wav" });
    const accepted = await handleTurn.handleVoiceTurn(audio);
    assert.equal(accepted.status, 202);

    const barge = await handleTurn.handleVoiceTurn(bargeIn.createBargeInBlob());
    assert.equal(barge.status, 200);
    const body = await barge.json();
    assert.equal(body.mode, "barge-in");
    assert.equal(body.aborted, true);

    await handleTurn.waitForPendingVoiceTurns();
    assert.ok(
      received.some((e) => e.eventType === "voice.state" && e.data?.state === "idle"),
    );
  });

  it("runJarvisAgent honors killSignal and still emits agent.step", async () => {
    setCiVoiceMockEnv();
    eventBus.resetCockpitEventBusForTests();
    const steps = [];
    eventBus.getCockpitEventBus().subscribe((type, data) => {
      if (type === "agent.step") steps.push(data);
    });

    const controller = new AbortController();
    controller.abort();
    const result = await agentRuntime.runJarvisAgent({
      turnId: randomUUID(),
      transcript: "Show me the cockpit dashboard",
      killSignal: controller.signal,
    });

    assert.equal(result.terminalReason, "killed");
    assert.ok(steps.some((s) => s.type === "killed"));
  });

  it("streams mock finish text through predictStream", async () => {
    setCiVoiceMockEnv();
    const tokens = [];
    const port = llmPort.createJarvisLlmPort();
    const result = await port.predictStream(
      {
        messages: [{ role: "user", content: "just chatting with no tools" }],
        tools: [],
      },
      { onToken: (delta) => tokens.push(delta) },
    );
    assert.ok(result.text);
    assert.ok(tokens.length > 1);
    assert.equal(tokens.join(""), result.text);
  });

  it("HUD parser labels existing agent.step types", () => {
    const step = parseVoice.parseAgentStepEvent({
      type: "tool_call",
      runId: "550e8400-e29b-41d4-a716-446655440001",
      stepIndex: 0,
      ts: "2026-09-12T00:00:00.000Z",
      toolName: "get_cockpit_summary",
      args: {},
    });
    assert.equal(parseVoice.agentStepHudLabel(step), "TOOL get_cockpit_summary");
  });

  it("does not treat Realtime as the default brain (chat completions port only)", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(join(webRoot, "lib/jarvis/llm-port.ts"), "utf8"),
    );
    assert.match(source, /chat\/completions/);
    assert.doesNotMatch(source, /realtime/);
  });
});
