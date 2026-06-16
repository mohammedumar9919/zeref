import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-3");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  PHASE3_CONTRACT_VERSION,
  PipelineStageSchema,
  JobTypeSchema,
  NormalizeJobInputSchema,
  NormalizeJobOutputSchema,
  EmbedJobInputSchema,
  EmbedJobOutputSchema,
  NormalizedPostPayloadSchema,
  MetricFactsPayloadSchema,
} = built;

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesRoot, name), "utf8"));
}

function roundTrip(schema, name) {
  const raw = loadFixture(name);
  const parsed = schema.parse(raw);
  const serialized = JSON.parse(JSON.stringify(parsed));
  const reparsed = schema.safeParse(serialized);
  assert.equal(
    reparsed.success,
    true,
    `round-trip failed for ${name}: ${reparsed.success ? "" : reparsed.error.message}`,
  );
  return parsed;
}

function assertRejected(schema, name) {
  const raw = loadFixture(name);
  assert.equal(schema.safeParse(raw).success, false, `expected ${name} rejected`);
}

test("exports PHASE3_CONTRACT_VERSION", () => {
  assert.equal(PHASE3_CONTRACT_VERSION, "3.1.0");
});

test("PipelineStage and JobType include embed", () => {
  assert.equal(PipelineStageSchema.parse("embed"), "embed");
  assert.equal(JobTypeSchema.parse("embed"), "embed");
});

test("NormalizeJobInput fixture round-trip (valid)", () => {
  roundTrip(NormalizeJobInputSchema, "normalize-job-input.valid.json");
});

test("NormalizeJobInput rejects raw blob (C6)", () => {
  assertRejected(NormalizeJobInputSchema, "normalize-job-input.invalid.json");
});

test("NormalizeJobOutput fixture round-trip (valid + insufficient_data)", () => {
  roundTrip(NormalizeJobOutputSchema, "normalize-job-output.valid.json");
  roundTrip(
    NormalizeJobOutputSchema,
    "normalize-job-output.insufficient-data.valid.json",
  );
});

test("EmbedJobInput fixture round-trip (valid)", () => {
  roundTrip(EmbedJobInputSchema, "embed-job-input.valid.json");
});

test("EmbedJobInput rejects raw blob (C6)", () => {
  assertRejected(EmbedJobInputSchema, "embed-job-input.invalid.json");
});

test("EmbedJobOutput fixture round-trip (valid)", () => {
  roundTrip(EmbedJobOutputSchema, "embed-job-output.valid.json");
});

test("NormalizedPostPayload fixture round-trip (valid)", () => {
  roundTrip(NormalizedPostPayloadSchema, "normalized-post-payload.valid.json");
});

test("NormalizedPostPayload rejects empty shortcode", () => {
  const raw = loadFixture("normalized-post-payload.invalid.json");
  assert.equal(NormalizedPostPayloadSchema.safeParse(raw).success, false);
});

test("MetricFactsPayload fixture round-trip (valid)", () => {
  roundTrip(MetricFactsPayloadSchema, "metric-facts-payload.valid.json");
});

test("MetricFactsPayload rejects missing platformAccountId", () => {
  assertRejected(MetricFactsPayloadSchema, "metric-facts-payload.invalid.json");
});
