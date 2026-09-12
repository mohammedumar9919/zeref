import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const core = await import(
  pathToFileURL(join(pkgRoot, "dist/core/index.js")).href
);

const { createSentenceBuffer, splitIntoSentences } = core;

describe("@zeref/jarvis-kernel sentence-buffer", () => {
  it("emits a sentence when punctuation plus space arrives", () => {
    const buf = createSentenceBuffer();
    assert.deepEqual(buf.push("Hello"), []);
    assert.deepEqual(buf.push(". "), ["Hello."]);
    assert.equal(buf.pending(), "");
  });

  it("splits multiple sentences and flushes remainder", () => {
    const buf = createSentenceBuffer();
    assert.deepEqual(buf.push("One. Two! Three? leftover"), [
      "One.",
      "Two!",
      "Three?",
    ]);
    assert.deepEqual(buf.flush(), ["leftover"]);
    assert.deepEqual(buf.flush(), []);
  });

  it("splitIntoSentences flushes a trailing fragment", () => {
    assert.deepEqual(splitIntoSentences("Right then. All sorted."), [
      "Right then.",
      "All sorted.",
    ]);
    assert.deepEqual(splitIntoSentences("No stop yet"), ["No stop yet"]);
    assert.deepEqual(splitIntoSentences("   "), []);
  });
});
