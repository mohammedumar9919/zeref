import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, it, before, after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(pkgRoot, "../..");
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

before(() => {
  mkdirSync(fixturesDir, { recursive: true });
  writeFileSync(join(fixturesDir, "tts-mock.wav"), createMinimalWav());
});

const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);

const {
  processTurn,
  processTurnSync,
  createDefaultDeps,
  defaultTtsAdapter,
  defaultLlmAdapter,
  getPipelineStatus,
  JarvisTurnInputSchema,
  JarvisTurnAckOutputSchema,
  JarvisTurnResultOutputSchema,
} = built;

const TURN = JarvisTurnInputSchema.parse({
  turnId: "550e8400-e29b-41d4-a716-446655440099",
  transcript: "What's the latest report headline?",
});

describe("@zeref/jarvis-kernel processTurn", () => {
  const originalEnv = { ...process.env };

  after(() => {
    process.env = originalEnv;
  });

  it("returns ack before slow path completes", async () => {
    process.env.ZEREF_LLM_MOCK = "1";
    process.env.ZEREF_TTS_MOCK = "1";

    let slowStarted = false;
    const deps = createDefaultDeps({
      slowPathDelayMs: 75,
      llm: async (input) => {
        slowStarted = true;
        return defaultLlmAdapter(input);
      },
    });

    const handle = processTurn(TURN, deps);
    JarvisTurnAckOutputSchema.parse(handle.ack);
    assert.match(handle.ack.ackText, /report/i);
    assert.equal(slowStarted, false, "ack must not await slow path start");

    const result = await handle.complete;
    JarvisTurnResultOutputSchema.parse(result);
    assert.equal(slowStarted, true);
    assert.match(result.resultText, /headline/i);
    assert.equal(result.toolCalls[0]?.name, "get_latest_report_headline");
  });

  it("processTurnSync merges ack and result for CI mock path", async () => {
    process.env.ZEREF_LLM_MOCK = "1";
    const output = await processTurnSync(TURN, createDefaultDeps());
    assert.match(output.ackText, /report/i);
    assert.match(output.resultText, /headline/i);
    assert.ok(output.events.length >= 2);
  });

  it("get_pipeline_status is honest when worker absent", async () => {
    const result = await getPipelineStatus({}, { workerAvailable: false });
    assert.equal(result.available, false);
    assert.equal(result.status, "unavailable");
  });
});

describe("@zeref/jarvis-kernel TTS", () => {
  const originalEnv = { ...process.env };

  after(() => {
    process.env = originalEnv;
  });

  it("uses fixture wav when ZEREF_TTS_MOCK=1 without network", async () => {
    process.env.ZEREF_TTS_MOCK = "1";
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const result = await defaultTtsAdapter("Checking reports now.");
    assert.equal(result.mocked, true);
    assert.equal(result.provider, "mock");
    assert.equal(result.mimeType, "audio/wav");
    assert.ok(result.audio.length > 44);
    assert.ok(result.durationMs >= 250);
    assert.ok(
      wavPcmRms(result.audio) > 100,
      "mock TTS fixture must be audible (non-zero PCM RMS)",
    );
  });
});
