import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-8");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  PHASE8_CONTRACT_VERSION,
  CockpitSlicesSchemaV8,
  CalendarEventSchema,
  StudioDraftSchema,
  JobEnqueueRequestSchema,
  CalendarEventStatusSchema,
  UiJobTypeSchema,
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

test("exports PHASE8_CONTRACT_VERSION", () => {
  assert.equal(PHASE8_CONTRACT_VERSION, "8.0.0");
});

test("CockpitSlicesSchemaV8 fixture round-trip (phase8-cockpit-v1)", () => {
  const parsed = roundTrip(CockpitSlicesSchemaV8, "cockpit-slices.valid.json");
  assert.equal(parsed.schemaVersion, "phase8-cockpit-v1");
  assert.equal(parsed.panels.studio.items[0].hasDraft, true);
  assert.equal(parsed.panels.calendar.items[0].status, "scheduled");
});

test("CalendarEventSchema fixture round-trip", () => {
  const parsed = roundTrip(CalendarEventSchema, "calendar-event.valid.json");
  assert.equal(parsed.status, "scheduled");
  assert.equal(parsed.jobType, "embed");
});

test("StudioDraftSchema fixture round-trip", () => {
  const parsed = roundTrip(StudioDraftSchema, "studio-draft.valid.json");
  assert.deepEqual(parsed.tags, ["ride-log", "night"]);
});

test("JobEnqueueRequestSchema accepts allowlisted job types", () => {
  roundTrip(JobEnqueueRequestSchema, "job-enqueue.valid.json");
  for (const jobType of UiJobTypeSchema.options) {
    assert.equal(
      JobEnqueueRequestSchema.safeParse({ jobType }).success,
      true,
      `expected ${jobType} accepted`,
    );
  }
});

test("JobEnqueueRequestSchema rejects collect at schema layer", () => {
  assert.equal(
    JobEnqueueRequestSchema.safeParse({
      jobType: "collect",
      snapshotId: "550e8400-e29b-41d4-a716-446655440002",
    }).success,
    false,
    "collect must be rejected by UiJobTypeSchema enum",
  );
});

test("CalendarEventStatusSchema locks status enum", () => {
  assert.deepEqual(CalendarEventStatusSchema.options, [
    "draft",
    "scheduled",
    "completed",
    "cancelled",
  ]);
});
