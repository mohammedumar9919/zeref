import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-1");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  PHASE1_CONTRACT_VERSION,
  NormalizeJobInputSchema,
  AnalyzeJobInputSchema,
  ReportJobInputSchema,
  PlatformSchema,
  SnapshotKindSchema,
  PipelineStageSchema,
  JobTypeSchema,
} = built;

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesRoot, name), "utf8"));
}

function roundTrip(schema, fixtureName) {
  const raw = loadFixture(fixtureName);
  const parsed = schema.parse(raw);
  const serialized = JSON.parse(JSON.stringify(parsed));
  const reparsed = schema.safeParse(serialized);
  assert.equal(
    reparsed.success,
    true,
    `round-trip failed for ${fixtureName}: ${reparsed.success ? "" : reparsed.error.message}`,
  );
  return parsed;
}

function assertRejected(schema, fixtureName) {
  const raw = loadFixture(fixtureName);
  const result = schema.safeParse(raw);
  assert.equal(result.success, false, `expected ${fixtureName} to be rejected`);
}

test("exports PHASE1_CONTRACT_VERSION", () => {
  assert.equal(PHASE1_CONTRACT_VERSION, "1.0.0");
});

test("enum schemas round-trip fixture values", () => {
  assert.equal(PlatformSchema.parse("instagram"), "instagram");
  assert.equal(
    SnapshotKindSchema.parse("instagram_post_raw"),
    "instagram_post_raw",
  );
  assert.equal(PipelineStageSchema.parse("collect"), "collect");
  assert.equal(JobTypeSchema.parse("report"), "report");
});

test("NormalizeJobInput fixture round-trip (valid)", () => {
  roundTrip(NormalizeJobInputSchema, "normalize-job.valid.json");
});

test("NormalizeJobInput rejects raw blob fields (C6)", () => {
  assertRejected(
    NormalizeJobInputSchema,
    "normalize-job.invalid-raw-blob.json",
  );
});

test("AnalyzeJobInput fixture round-trip (valid + insufficient_data)", () => {
  roundTrip(AnalyzeJobInputSchema, "analyze-job.valid.json");
  roundTrip(
    AnalyzeJobInputSchema,
    "analyze-job.insufficient-data.valid.json",
  );
});

test("AnalyzeJobInput rejects raw blob fields (C6)", () => {
  assertRejected(AnalyzeJobInputSchema, "analyze-job.invalid-raw-blob.json");
});

test("ReportJobInput fixture round-trip (valid + insufficient_data)", () => {
  roundTrip(ReportJobInputSchema, "report-job.valid.json");
  roundTrip(
    ReportJobInputSchema,
    "report-job.insufficient-data.valid.json",
  );
});

test("ReportJobInput rejects raw blob fields (C6)", () => {
  assertRejected(ReportJobInputSchema, "report-job.invalid-raw-blob.json");
});
