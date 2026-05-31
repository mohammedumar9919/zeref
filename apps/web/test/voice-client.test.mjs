import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const parseVoice = await import(
  pathToFileURL(join(webRoot, "lib/voice/parse-voice-events.ts")).href
);

describe("parse-voice-events", () => {
  it("parses voice.state fixture", () => {
    const parsed = parseVoice.parseVoiceStateEvent({
      type: "voice.state",
      turnId: "550e8400-e29b-41d4-a716-446655440099",
      state: "thinking",
      ts: "2026-05-30T12:00:00.000Z",
    });
    assert.equal(parsed.state, "thinking");
  });

  it("parses voice.audio ack phase", () => {
    const parsed = parseVoice.parseVoiceAudioEvent({
      type: "voice.audio",
      turnId: "550e8400-e29b-41d4-a716-446655440001",
      phase: "ack",
      audioBase64: "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
      mimeType: "audio/wav",
      ts: "2026-05-30T12:00:00.200Z",
    });
    assert.equal(parsed.phase, "ack");
  });
});
