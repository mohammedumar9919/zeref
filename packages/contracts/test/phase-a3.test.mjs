import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/cloud-a3");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const { ResearchIntelSchema, ResearchSignalTypeSchema, JarvisToolNameSchema } = built;

test("ResearchIntelSchema accepts cloud-a3 fixture", () => {
  const raw = JSON.parse(readFileSync(join(fixturesRoot, "research-intel.valid.json"), "utf8"));
  const parsed = ResearchIntelSchema.parse(raw);
  assert.equal(parsed.outliers.length, 1);
  assert.ok(parsed.outliers[0].multiplier >= 5);
  assert.match(parsed.weeklyBrief.text, /HIT999/);
  assert.equal(parsed.competitor.source, "fixture");
});

test("ResearchSignalTypeSchema includes A3 intel types", () => {
  for (const type of ["engagement_outlier", "caption_hook", "weekly_brief", "competitor_graph"]) {
    assert.equal(ResearchSignalTypeSchema.safeParse(type).success, true, type);
  }
});

test("JarvisToolNameSchema includes research intel read tools", () => {
  assert.equal(JarvisToolNameSchema.safeParse("get_research_outliers").success, true);
  assert.equal(JarvisToolNameSchema.safeParse("get_weekly_brief").success, true);
});
