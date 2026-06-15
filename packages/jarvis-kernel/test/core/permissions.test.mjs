import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const core = await import(
  pathToFileURL(join(pkgRoot, "dist/core/index.js")).href
);

const { confirmRequired, canExecuteTool, isWriteTier } = core;

describe("@zeref/jarvis-kernel core permissions", () => {
  it("requires confirm only for write-high", () => {
    assert.equal(confirmRequired("read"), false);
    assert.equal(confirmRequired("write-low"), false);
    assert.equal(confirmRequired("write-high"), true);
  });

  it("blocks write-high until confirmed", () => {
    assert.equal(canExecuteTool("read", false), true);
    assert.equal(canExecuteTool("write-low", false), true);
    assert.equal(canExecuteTool("write-high", false), false);
    assert.equal(canExecuteTool("write-high", true), true);
  });

  it("classifies write tiers", () => {
    assert.equal(isWriteTier("read"), false);
    assert.equal(isWriteTier("write-low"), true);
    assert.equal(isWriteTier("write-high"), true);
  });
});
