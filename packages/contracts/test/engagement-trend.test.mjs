import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const { EngagementTrendSchema, PHASE14_CONTRACT_VERSION } = built;

const fixture = JSON.parse(
  readFileSync(join(repoRoot, "fixtures/phase-14/engagement-trend.json"), "utf8"),
);

test("phase14 contract version", () => {
  assert.equal(PHASE14_CONTRACT_VERSION, "14.0.0");
});

test("engagement trend fixture parses", () => {
  const trend = EngagementTrendSchema.parse(fixture);
  assert.equal(trend.source, "fixture");
  assert.ok(trend.points.length >= 6);
});

test("unsorted points are rejected", () => {
  const points = [...fixture.points].reverse();
  assert.equal(EngagementTrendSchema.safeParse({ ...fixture, points }).success, false);
});

test("timeBasis must be published or collected", () => {
  const points = fixture.points.map((p, i) => (i === 0 ? { ...p, timeBasis: "guessed" } : p));
  assert.equal(EngagementTrendSchema.safeParse({ ...fixture, points }).success, false);
});

test("null scores are allowed (unscored posts)", () => {
  const points = fixture.points.map((p, i) => (i === 0 ? { ...p, engagementScore: null } : p));
  assert.equal(EngagementTrendSchema.safeParse({ ...fixture, points }).success, true);
});
