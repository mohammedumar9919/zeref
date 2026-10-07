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

  it("blocks write-high unless the grant matches run, tool and args", () => {
    const call = { runId: "r1", toolName: "enqueue_job", argsHash: "abc" };
    assert.equal(canExecuteTool("read", undefined, call), true);
    assert.equal(canExecuteTool("write-low", undefined, call), true);
    assert.equal(canExecuteTool("write-high", undefined, call), false);
    assert.equal(canExecuteTool("write-high", true, call), false);
    assert.equal(canExecuteTool("write-high", { ...call }, call), true);
    assert.equal(canExecuteTool("write-high", { ...call, runId: "r2" }, call), false);
    assert.equal(canExecuteTool("write-high", { ...call, toolName: "vault_forget" }, call), false);
    assert.equal(canExecuteTool("write-high", { ...call, argsHash: "xyz" }, call), false);
  });

  it("classifies write tiers", () => {
    assert.equal(isWriteTier("read"), false);
    assert.equal(isWriteTier("write-low"), true);
    assert.equal(isWriteTier("write-high"), true);
  });
});
