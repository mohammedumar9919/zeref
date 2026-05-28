import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const built = await import(pathToFileURL(join(packageRoot, "../dist/index.js")).href);

test("exports PHASE0_CONTRACT_VERSION", () => {
  assert.equal(typeof built.PHASE0_CONTRACT_VERSION, "string");
  assert.match(built.PHASE0_CONTRACT_VERSION, /^0\./);
});

test("exports PHASE1_CONTRACT_VERSION", () => {
  assert.equal(typeof built.PHASE1_CONTRACT_VERSION, "string");
  assert.match(built.PHASE1_CONTRACT_VERSION, /^1\./);
});