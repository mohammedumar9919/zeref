import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-9");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  PHASE9_CONTRACT_VERSION,
  CockpitSlicesSchemaV9,
  ResearchTopicSchema,
  ResearchSignalSchema,
  ResearchTopicDetailSchema,
  ResearchJobInputSchema,
  ResearchJobOutputSchema,
  UiJobTypeSchemaV9,
  JobEnqueueRequestSchemaV9,
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

test("exports PHASE9_CONTRACT_VERSION", () => {
  assert.equal(PHASE9_CONTRACT_VERSION, "9.0.0");
});

test("CockpitSlicesSchemaV9 fixture round-trip (phase9-cockpit-v1)", () => {
  const parsed = roundTrip(CockpitSlicesSchemaV9, "cockpit-slices.valid.json");
  assert.equal(parsed.schemaVersion, "phase9-cockpit-v1");
  assert.equal(parsed.panels.research.insufficientData, false);
  assert.equal(parsed.panels.research.items[0].signalCount, 2);
  assert.equal(parsed.panels.research.items[0].lastComputedAt, "2026-06-03T10:00:00.000Z");
});

test("ResearchTopicSchema fixture round-trip", () => {
  const parsed = roundTrip(ResearchTopicSchema, "research-topic.valid.json");
  assert.equal(parsed.signalCount, 2);
  assert.equal(parsed.trendScore, 0.65);
});

test("ResearchSignalSchema fixture array round-trip", () => {
  const raw = loadFixture("research-signals.valid.json");
  assert.equal(raw.length, 2);
  for (const item of raw) {
    const parsed = ResearchSignalSchema.parse(item);
    const reparsed = ResearchSignalSchema.safeParse(JSON.parse(JSON.stringify(parsed)));
    assert.equal(reparsed.success, true);
  }
});

test("ResearchTopicDetailSchema composes topic + signals", () => {
  const detail = ResearchTopicDetailSchema.parse({
    topic: loadFixture("research-topic.valid.json"),
    signals: loadFixture("research-signals.valid.json"),
  });
  assert.equal(detail.signals.length, 2);
});

test("ResearchJobInputSchema and ResearchJobOutputSchema round-trip", () => {
  roundTrip(ResearchJobInputSchema, "research-job-input.valid.json");
  roundTrip(ResearchJobOutputSchema, "research-job-output.valid.json");
});

test("UiJobTypeSchemaV9 includes research (Amendment L)", () => {
  assert.ok(UiJobTypeSchemaV9.options.includes("research"));
  assert.equal(
    JobEnqueueRequestSchemaV9.safeParse({
      jobType: "research",
      topicId: "770e8400-e29b-41d4-a716-446655440001",
    }).success,
    true,
  );
  assert.equal(JobEnqueueRequestSchemaV9.safeParse({ jobType: "collect" }).success, false);
});
