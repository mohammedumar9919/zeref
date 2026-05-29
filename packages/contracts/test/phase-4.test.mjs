import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-4");
const eliteFixtures = join(fixturesRoot, "elite");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  PHASE4_CONTRACT_VERSION,
  AnalyzeJobInputSchema,
  AnalyzeJobOutputSchema,
  ReportJobInputSchema,
  ReportJobOutputSchema,
  EliteReportSchema,
} = built;

function loadFixture(name, root = fixturesRoot) {
  return JSON.parse(readFileSync(join(root, name), "utf8"));
}

function roundTrip(schema, name, root = fixturesRoot) {
  const raw = loadFixture(name, root);
  const parsed = schema.parse(raw);
  const serialized = JSON.parse(JSON.stringify(parsed));
  const reparsed = schema.safeParse(serialized);
  assert.equal(reparsed.success, true, `round-trip failed for ${name}`);
  return parsed;
}

test("exports PHASE4_CONTRACT_VERSION", () => {
  assert.equal(PHASE4_CONTRACT_VERSION, "4.0.0");
});

test("AnalyzeJobInput fixture round-trip", () => {
  roundTrip(AnalyzeJobInputSchema, "analyze-job-input.valid.json");
});

test("AnalyzeJobOutput fixture round-trip", () => {
  roundTrip(AnalyzeJobOutputSchema, "analyze-job-output.valid.json");
});

test("ReportJobInput fixture round-trip", () => {
  roundTrip(ReportJobInputSchema, "report-job-input.valid.json");
});

test("ReportJobOutput fixture round-trip", () => {
  roundTrip(ReportJobOutputSchema, "report-job-output.valid.json");
});

test("EliteReport golden fixture validates", () => {
  roundTrip(EliteReportSchema, "ride-log-elite.golden.json", eliteFixtures);
});
