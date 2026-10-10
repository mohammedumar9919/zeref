import assert from "node:assert/strict";
import { test } from "node:test";

import { memoryEmbedModel, shouldAttachEmbedder } from "../../lib/jarvis/memory-port.ts";

test("mock embed provider stays lexical (no meaningless vector recall)", () => {
  assert.equal(shouldAttachEmbedder({}), false);
  assert.equal(shouldAttachEmbedder({ ZEREF_EMBED_PROVIDER: "mock" }), false);
  assert.equal(memoryEmbedModel({}), "mock-sha256");
});

test("real embed providers attach the embedder for hybrid recall", () => {
  assert.equal(shouldAttachEmbedder({ ZEREF_EMBED_PROVIDER: "openai" }), true);
  assert.equal(shouldAttachEmbedder({ ZEREF_EMBED_PROVIDER: "nomic" }), true);
  assert.notEqual(memoryEmbedModel({ ZEREF_EMBED_PROVIDER: "openai" }), "mock-sha256");
});
