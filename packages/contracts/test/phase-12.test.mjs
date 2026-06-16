import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-12");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  PHASE12_CONTRACT_VERSION,
  DataAgeStateSchema,
  CockpitItemDataAgeSchema,
  NormalizedPostPayloadSchema,
  CockpitStudioItemSchemaV8,
  CockpitStudioPanelSchemaV8,
  CockpitStudioItemSchemaV9,
  CockpitStudioPanelSchemaV9,
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

test("exports PHASE12_CONTRACT_VERSION", () => {
  assert.equal(PHASE12_CONTRACT_VERSION, "12.0.0");
});

test("DataAgeStateSchema accepts fixture, stale, live", () => {
  for (const state of ["fixture", "stale", "live"]) {
    assert.equal(DataAgeStateSchema.parse(state), state);
  }
  assert.equal(DataAgeStateSchema.safeParse("unknown").success, false);
});

test("CockpitItemDataAgeSchema fixture round-trip", () => {
  const parsed = roundTrip(CockpitItemDataAgeSchema, "cockpit-item-data-age.valid.json");
  assert.equal(parsed.dataAgeState, "live");
  assert.equal(parsed.dataAgeMs, 3600000);
});

test("NormalizedPostPayload accepts optional media fields (C163)", () => {
  const parsed = roundTrip(
    NormalizedPostPayloadSchema,
    "normalized-post-with-media.valid.json",
  );
  assert.equal(parsed.thumbnailUrl, "https://scontent.cdninstagram.com/v/thumb-carousel.jpg");
  assert.equal(parsed.videoUrl, "https://scontent.cdninstagram.com/v/reel-preview.mp4");
  assert.deepEqual(parsed.carouselUrls, [
    "https://scontent.cdninstagram.com/v/carousel-1.jpg",
    "https://scontent.cdninstagram.com/v/carousel-2.jpg",
  ]);
});

test("CockpitStudioItemSchemaV8 accepts optional data-age item fields", () => {
  const parsed = CockpitStudioItemSchemaV8.parse({
    entityId: "550e8400-e29b-41d4-a716-446655440001",
    title: "Ride log",
    collectedAt: "2026-06-15T10:00:00.000Z",
    dataAgeMs: 0,
    dataAgeState: "fixture",
  });
  assert.equal(parsed.dataAgeState, "fixture");
});

test("CockpitStudioPanelSchemaV8 accepts optional panel dataAgeState", () => {
  const parsed = CockpitStudioPanelSchemaV8.parse({
    insufficientData: false,
    dataAgeState: "live",
    items: [
      {
        entityId: "550e8400-e29b-41d4-a716-446655440001",
        title: "Ride log",
      },
    ],
  });
  assert.equal(parsed.dataAgeState, "live");
});

test("CockpitStudioItemSchemaV9 accepts optional data-age item fields", () => {
  const parsed = CockpitStudioItemSchemaV9.parse({
    entityId: "550e8400-e29b-41d4-a716-446655440001",
    title: "Ride log",
    dataAgeMs: 86400000,
    dataAgeState: "stale",
  });
  assert.equal(parsed.dataAgeState, "stale");
});

test("CockpitStudioPanelSchemaV9 accepts optional panel dataAgeState", () => {
  const parsed = CockpitStudioPanelSchemaV9.parse({
    insufficientData: true,
    dataAgeState: "fixture",
    items: [],
  });
  assert.equal(parsed.dataAgeState, "fixture");
});
