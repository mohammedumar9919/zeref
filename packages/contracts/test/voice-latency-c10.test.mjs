import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const { VoiceAudioEventSchema, VoiceLatencySampleSchema, FIRST_AUDIO_TARGET_MS } = built;

const TURN_ID = "550e8400-e29b-41d4-a716-446655440010";

const baseAudio = {
  type: "voice.audio",
  turnId: TURN_ID,
  phase: "result",
  audioBase64: "AAAA",
  mimeType: "audio/wav",
  ts: "2026-10-09T00:00:00.000Z",
};

test("C10: FIRST_AUDIO_TARGET_MS is exported from contracts", () => {
  assert.equal(FIRST_AUDIO_TARGET_MS, 1200);
});

test("C10: existing voice.audio fixture stays valid without seq", () => {
  const fixture = JSON.parse(
    readFileSync(join(repoRoot, "fixtures/phase-6/voice-audio-event.valid.json"), "utf8"),
  );
  const parsed = VoiceAudioEventSchema.parse(fixture);
  assert.equal(parsed.seq, undefined);
  assert.equal(parsed.serverFirstAudioMs, undefined);
});

test("C10: voice.audio accepts seq and serverFirstAudioMs", () => {
  const parsed = VoiceAudioEventSchema.parse({ ...baseAudio, seq: 0, serverFirstAudioMs: 812.5 });
  assert.equal(parsed.seq, 0);
  assert.equal(parsed.serverFirstAudioMs, 812.5);
});

test("C10: voice.audio rejects bad seq / negative serverFirstAudioMs / unknown keys", () => {
  assert.equal(VoiceAudioEventSchema.safeParse({ ...baseAudio, seq: -1 }).success, false);
  assert.equal(VoiceAudioEventSchema.safeParse({ ...baseAudio, seq: 1.5 }).success, false);
  assert.equal(
    VoiceAudioEventSchema.safeParse({ ...baseAudio, serverFirstAudioMs: -3 }).success,
    false,
  );
  assert.equal(VoiceAudioEventSchema.safeParse({ ...baseAudio, extra: 1 }).success, false);
});

test("C10: VoiceLatencySampleSchema is strict and client-only", () => {
  const ok = VoiceLatencySampleSchema.parse({
    turnId: TURN_ID,
    firstAudioMs: 900,
    source: "client",
  });
  assert.equal(ok.firstAudioMs, 900);
  assert.equal(
    VoiceLatencySampleSchema.safeParse({ turnId: TURN_ID, firstAudioMs: 900, source: "server" })
      .success,
    false,
  );
  assert.equal(
    VoiceLatencySampleSchema.safeParse({ turnId: TURN_ID, firstAudioMs: -1, source: "client" })
      .success,
    false,
  );
  assert.equal(
    VoiceLatencySampleSchema.safeParse({ turnId: "nope", firstAudioMs: 1, source: "client" })
      .success,
    false,
  );
  assert.equal(
    VoiceLatencySampleSchema.safeParse({
      turnId: TURN_ID,
      firstAudioMs: 1,
      source: "client",
      p50: 1,
    }).success,
    false,
  );
});
