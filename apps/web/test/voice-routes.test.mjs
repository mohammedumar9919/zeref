import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");
const repoRoot = join(webRoot, "../..");
const fixturesDir = join(repoRoot, "fixtures/phase-6");

/** CI/UAT mock WAV: 440 Hz tone, mono 16-bit PCM @ 8 kHz, 0.25 s (non-silent). */
function createMinimalWav() {
  const sampleRate = 8000;
  const durationSec = 0.25;
  const frequencyHz = 440;
  const peakAmplitude = 0.3;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(
      peakAmplitude *
        32767 *
        Math.sin((2 * Math.PI * frequencyHz * i) / sampleRate),
    );
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  return buffer;
}

function wavPcmRms(wavBuffer) {
  const dataOffset = 44;
  const sampleCount = (wavBuffer.length - dataOffset) / 2;
  let sumSq = 0;
  for (let i = 0; i < sampleCount; i++) {
    const sample = wavBuffer.readInt16LE(dataOffset + i * 2);
    sumSq += sample * sample;
  }
  return Math.sqrt(sumSq / sampleCount);
}

function setCiVoiceMockEnv() {
  process.env.ZEREF_WHISPER_MOCK = "1";
  process.env.ZEREF_TTS_MOCK = "1";
  process.env.ZEREF_LLM_MOCK = "1";
  process.env.ZEREF_BFF_FIXTURE = "1";
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.OPENAI_API_KEY;
}

function setLiveVoiceMockEnv() {
  process.env.ZEREF_WHISPER_MOCK = "1";
  process.env.ZEREF_TTS_MOCK = "1";
  delete process.env.ZEREF_LLM_MOCK;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.OPENAI_API_KEY;
}

function clearVoiceEnv() {
  delete process.env.ZEREF_WHISPER_MOCK;
  delete process.env.ZEREF_TTS_MOCK;
  delete process.env.ZEREF_LLM_MOCK;
  delete process.env.ZEREF_BFF_FIXTURE;
  delete process.env.ZEREF_PHASE11_AGENT;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.OPENAI_API_KEY;
}

before(() => {
  mkdirSync(fixturesDir, { recursive: true });
  writeFileSync(join(fixturesDir, "tts-mock.wav"), createMinimalWav());
});

const mockFlags = await import(
  pathToFileURL(join(webRoot, "lib/voice/mock-flags.ts")).href
);
const whisperClient = await import(
  pathToFileURL(join(webRoot, "lib/voice/whisper-client.ts")).href
);
const voiceBus = await import(
  pathToFileURL(join(webRoot, "lib/voice/voice-event-bus.ts")).href
);
const handleTurn = await import(
  pathToFileURL(join(webRoot, "lib/voice/handle-turn.ts")).href
);
const turnRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/voice/turn/route.ts")).href
);
const healthRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/voice/health/route.ts")).href
);
const eventsRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/events/stream/route.ts")).href
);

describe("voice mock flags", () => {
  after(clearVoiceEnv);

  it("isCiVoiceMockMode true when all three mock flags set", () => {
    setCiVoiceMockEnv();
    assert.equal(mockFlags.isCiVoiceMockMode(), true);
  });

  it("isCiVoiceMockMode false when LLM mock unset", () => {
    setLiveVoiceMockEnv();
    assert.equal(mockFlags.isCiVoiceMockMode(), false);
  });
});

describe("whisper-client", () => {
  after(clearVoiceEnv);

  it("returns fixture transcript when ZEREF_WHISPER_MOCK=1", async () => {
    process.env.ZEREF_WHISPER_MOCK = "1";
    const audio = new Blob([createMinimalWav()], { type: "audio/wav" });
    const result = await whisperClient.transcribeAudio(audio);
    assert.equal(result.mocked, true);
    assert.match(result.text, /report headline/i);
  });

  it("checkWhisperHealth reports mock mode without sidecar", async () => {
    process.env.ZEREF_WHISPER_MOCK = "1";
    const health = await whisperClient.checkWhisperHealth();
    assert.equal(health.ok, true);
    assert.equal(health.mocked, true);
  });
});

describe("voice-event-bus", () => {
  after(() => {
    voiceBus.resetVoiceEventBusForTests();
  });

  it("delivers emitted events to subscribers", () => {
    voiceBus.resetVoiceEventBusForTests();
    const received = [];
    const unsubscribe = voiceBus.getVoiceEventBus().subscribe((eventType, data) => {
      received.push({ eventType, data });
    });

    voiceBus.getVoiceEventBus().emit("voice.transcript", {
      type: "voice.transcript",
      turnId: "550e8400-e29b-41d4-a716-446655440099",
      role: "user",
      text: "hello",
      ts: "2026-05-30T12:00:00.000Z",
    });
    unsubscribe();

    assert.equal(received.length, 1);
    assert.equal(received[0].eventType, "voice.transcript");
  });
});

describe("handleVoiceTurn", () => {
  after(() => {
    clearVoiceEnv();
    voiceBus.resetVoiceEventBusForTests();
  });

  it("returns 200 sync JSON with both audio blobs in CI mock mode", async () => {
    setCiVoiceMockEnv();
    voiceBus.resetVoiceEventBusForTests();

    const audio = new Blob([createMinimalWav()], { type: "audio/wav" });
    const response = await handleTurn.handleVoiceTurn(audio);
    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.mode, "sync-mock");
    assert.match(body.transcript, /report headline/i);
    assert.match(body.ackText, /report/i);
    assert.match(body.resultText, /headline/i);
    assert.ok(body.ackAudio?.audioBase64?.length > 0);
    assert.ok(body.resultAudio?.audioBase64?.length > 0);
    assert.equal(body.ackAudio.mimeType, "audio/wav");

    const ackWav = Buffer.from(body.ackAudio.audioBase64, "base64");
    const resultWav = Buffer.from(body.resultAudio.audioBase64, "base64");
    assert.ok(
      wavPcmRms(ackWav) > 100,
      "mock TTS ack audio must be audible (non-zero PCM RMS)",
    );
    assert.ok(
      wavPcmRms(resultWav) > 100,
      "mock TTS result audio must be audible (non-zero PCM RMS)",
    );
  });

  it("returns 202 and emits ack events on SSE bus in live mode", async () => {
    setLiveVoiceMockEnv();
    voiceBus.resetVoiceEventBusForTests();

    const received = [];
    voiceBus.getVoiceEventBus().subscribe((eventType, data) => {
      received.push({ eventType, data });
    });

    const audio = new Blob([createMinimalWav()], { type: "audio/wav" });
    const response = await handleTurn.handleVoiceTurn(audio);
    assert.equal(response.status, 202);

    const body = await response.json();
    assert.ok(body.turnId);
    assert.match(body.transcript, /report headline/i);

    assert.ok(received.some((e) => e.eventType === "voice.transcript"));
    assert.ok(received.some((e) => e.eventType === "voice.audio"));
    assert.ok(
      received.some(
        (e) => e.eventType === "voice.audio" && e.data?.phase === "ack",
      ),
    );

    await handleTurn.waitForPendingVoiceTurns();
    assert.ok(
      received.some(
        (e) => e.eventType === "voice.audio" && e.data?.phase === "result",
      ),
    );
  });
});

describe("voice route handlers", () => {
  after(clearVoiceEnv);

  it("POST /voice/turn accepts multipart audio in CI mock mode", async () => {
    setCiVoiceMockEnv();
    voiceBus.resetVoiceEventBusForTests();

    const form = new FormData();
    form.append("audio", new Blob([createMinimalWav()], { type: "audio/wav" }), "sample.wav");

    const response = await turnRoute.POST(
      new Request("http://localhost/api/v1/voice/turn", {
        method: "POST",
        body: form,
      }),
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.mode, "sync-mock");
    assert.ok(body.ackAudio?.audioBase64);
  });

  it("GET /voice/health reports mock flags", async () => {
    setCiVoiceMockEnv();
    const response = await healthRoute.GET();
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.whisper.mock, true);
    assert.equal(body.flags.ZEREF_WHISPER_MOCK, true);
    assert.equal(body.flags.ZEREF_TTS_MOCK, true);
    assert.equal(body.flags.ZEREF_LLM_MOCK, true);
  });
});

describe("events stream voice subscription", () => {
  after(() => {
    voiceBus.resetVoiceEventBusForTests();
  });

  it("forwards cockpit bus voice payloads as SSE frames", async () => {
    voiceBus.resetVoiceEventBusForTests();

    const response = await eventsRoute.GET();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    voiceBus.getVoiceEventBus().emit("voice.state", {
      type: "voice.state",
      turnId: "550e8400-e29b-41d4-a716-446655440099",
      state: "thinking",
      ts: "2026-05-30T12:00:00.000Z",
    });

    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.includes("event: voice.state")) break;
    }

    await reader.cancel();
    assert.match(buffer, /event: voice\.state/);
    assert.match(buffer, /thinking/);
  });
});

describe("voice turn memory SSE (P7-C)", () => {
  after(() => {
    clearVoiceEnv();
    delete process.env.ZEREF_MEMORY_MOCK;
    delete process.env.ZEREF_PHASE7_BRAIN;
    voiceBus.resetVoiceEventBusForTests();
  });

  it("emits memory.saved on cockpit bus in CI sync-mock mode when phase7 brain + memory mock enabled", async () => {
    setCiVoiceMockEnv();
    process.env.ZEREF_MEMORY_MOCK = "1";
    process.env.ZEREF_PHASE7_BRAIN = "1";
    voiceBus.resetVoiceEventBusForTests();

    const received = [];
    voiceBus.getVoiceEventBus().subscribe((eventType, data) => {
      received.push({ eventType, data });
    });

    const audio = new Blob([createMinimalWav()], { type: "audio/wav" });
    const response = await handleTurn.handleVoiceTurn(audio);
    assert.equal(response.status, 200);

    assert.ok(
      received.some((e) => e.eventType === "memory.saved"),
      "expected memory.saved on cockpit bus (sync-mock)",
    );
    const saved = received.find((e) => e.eventType === "memory.saved");
    assert.equal(saved.data.simulated, true);
  });

  it("emits memory.saved on cockpit bus after live turn with remember transcript", async () => {
    setLiveVoiceMockEnv();
    process.env.ZEREF_MEMORY_MOCK = "1";
    voiceBus.resetVoiceEventBusForTests();

    const kernel = await import(
      pathToFileURL(
        join(repoRoot, "packages/jarvis-kernel/dist/index.js"),
      ).href,
    );
    const emitBrain = await import(
      pathToFileURL(join(webRoot, "lib/memory/emit-brain-events.ts")).href,
    );

    const received = [];
    voiceBus.getVoiceEventBus().subscribe((eventType, data) => {
      received.push({ eventType, data });
    });

    const turnId = "550e8400-e29b-41d4-a716-446655440099";
    const handle = kernel.processTurn(
      {
        turnId,
        transcript: "Remember that the vault password is sunset",
        ts: "2026-05-31T12:00:00.000Z",
      },
      kernel.createDefaultDeps(),
    );
    const result = await handle.complete;
    emitBrain.emitMemoryBrainEventsFromToolCalls(result.toolCalls);

    assert.ok(
      received.some((e) => e.eventType === "memory.saved"),
      "expected memory.saved on cockpit bus",
    );
    const saved = received.find((e) => e.eventType === "memory.saved");
    assert.equal(saved.data.simulated, true);
  });
});
