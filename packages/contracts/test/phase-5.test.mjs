import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-5");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  PHASE5_CONTRACT_VERSION,
  CockpitSlicesSchema,
  CockpitStudioItemSchema,
  CockpitCalendarItemSchema,
  CockpitReportItemSchema,
  CockpitResearchItemSchema,
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
  assert.equal(
    schema.safeParse(loadFixture(name)).success,
    false,
    `expected ${name} rejected`,
  );
}

test("exports PHASE5_CONTRACT_VERSION", () => {
  assert.equal(PHASE5_CONTRACT_VERSION, "5.0.0");
});

test("CockpitSlicesSchema fixture round-trip (valid)", () => {
  const parsed = roundTrip(CockpitSlicesSchema, "cockpit-slices.valid.json");
  assert.equal(parsed.schemaVersion, "phase5-cockpit-v1");
  assert.equal(parsed.panels.research.insufficientData, true);
  assert.equal(parsed.panels.reports.items.length, 1);
  assert.equal(parsed.panels.reports.items[0].kind, "elite");
});

test("CockpitSlicesSchema rejects invalid fixture", () => {
  assertRejected(CockpitSlicesSchema, "cockpit-slices.invalid.json");
});

test("panel item DTOs validate representative items from fixture", () => {
  const slices = loadFixture("cockpit-slices.valid.json");
  CockpitStudioItemSchema.parse(slices.panels.studio.items[0]);
  CockpitReportItemSchema.parse(slices.panels.reports.items[0]);
  CockpitCalendarItemSchema.parse({ id: "550e8400-e29b-41d4-a716-446655440003", title: "Draft slot" });
  CockpitResearchItemSchema.parse({ id: "550e8400-e29b-41d4-a716-446655440004", title: "Night ride trend", trendScore: 0.82 });
});

test("CockpitSlicesSchema rejects unknown panel keys", () => {
  const raw = loadFixture("cockpit-slices.valid.json");
  raw.panels.extra = { items: [], insufficientData: false };
  assert.equal(CockpitSlicesSchema.safeParse(raw).success, false);
});
