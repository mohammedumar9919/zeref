import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const core = await import(
  pathToFileURL(join(pkgRoot, "dist/core/index.js")).href
);

const { FIRST_AUDIO_TARGET_MS, runTokenToTtsCascade } = core;

describe("@zeref/jarvis-kernel stream-cascade", () => {
  it("synthesizes each sentence as tokens arrive", async () => {
    const synthesized = [];
    const result = await runTokenToTtsCascade({
      tokens: ["Hello. ", "How are you? ", "Fine"],
      synthesize: async (sentence) => {
        synthesized.push(sentence);
        return { text: sentence };
      },
    });

    assert.deepEqual(synthesized, ["Hello.", "How are you?", "Fine"]);
    assert.equal(result.aborted, false);
    assert.equal(result.chunks.length, 3);
    assert.equal(typeof result.firstAudioMs, "number");
    assert.equal(result.firstAudioTargetMs, FIRST_AUDIO_TARGET_MS);
    assert.equal(FIRST_AUDIO_TARGET_MS, 1200);
  });

  it("stops TTS when killSignal aborts mid-cascade", async () => {
    const controller = new AbortController();
    const synthesized = [];

    const result = await runTokenToTtsCascade({
      tokens: ["First sentence. ", "Second sentence. ", "Third."],
      synthesize: async (sentence) => {
        synthesized.push(sentence);
        if (synthesized.length === 1) {
          controller.abort();
        }
        return { text: sentence };
      },
      killSignal: controller.signal,
    });

    assert.equal(result.aborted, true);
    assert.deepEqual(synthesized, ["First sentence."]);
    assert.equal(result.sentences.length, 0);
  });
});
