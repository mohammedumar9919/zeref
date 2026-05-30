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

test("exports PHASE2_CONTRACT_VERSION", () => {
  assert.equal(typeof built.PHASE2_CONTRACT_VERSION, "string");
  assert.match(built.PHASE2_CONTRACT_VERSION, /^2\./);
});

test("exports PHASE3_CONTRACT_VERSION", () => {
  assert.equal(typeof built.PHASE3_CONTRACT_VERSION, "string");
  assert.match(built.PHASE3_CONTRACT_VERSION, /^3\./);
});

test("exports PHASE4_CONTRACT_VERSION", () => {
  assert.equal(typeof built.PHASE4_CONTRACT_VERSION, "string");
  assert.match(built.PHASE4_CONTRACT_VERSION, /^4\./);
});

test("exports PHASE5_CONTRACT_VERSION", () => {
  assert.equal(typeof built.PHASE5_CONTRACT_VERSION, "string");
  assert.match(built.PHASE5_CONTRACT_VERSION, /^5\./);
});

test("exports PHASE5_1_CONTRACT_VERSION", () => {
  assert.equal(typeof built.PHASE5_1_CONTRACT_VERSION, "string");
  assert.match(built.PHASE5_1_CONTRACT_VERSION, /^5\.1\./);
});