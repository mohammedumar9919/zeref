import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-7");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  PHASE7_CONTRACT_VERSION,
  MemoryEntrySchema,
  MemorySearchResultSchema,
  MemoryEntitySchema,
  MemoryBrainEventSchema,
  MemorySavedEventSchema,
  MemoryContradictionEventSchema,
  CockpitSseOutboxSchema,
  MemoryTierSchema,
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

test("exports PHASE7_CONTRACT_VERSION", () => {
  assert.equal(PHASE7_CONTRACT_VERSION, "7.0.0");
});

test("MemoryEntrySchema fixture round-trip", () => {
  const parsed = roundTrip(MemoryEntrySchema, "memory-entry.valid.json");
  assert.equal(parsed.tier, "episodic");
  assert.equal(parsed.observation, "verified");
});

test("MemorySearchResultSchema fixture round-trip", () => {
  const parsed = roundTrip(MemorySearchResultSchema, "memory-search-result.valid.json");
  assert.equal(parsed.totalCount, 1);
  assert.equal(parsed.results[0].entry.tier, "episodic");
});

test("MemoryEntitySchema fixture round-trip", () => {
  const parsed = roundTrip(MemoryEntitySchema, "memory-entity.valid.json");
  assert.equal(parsed.type, "preference");
});

test("MemoryBrainEventSchema validates memory.saved fixture", () => {
  roundTrip(MemorySavedEventSchema, "memory-saved-event.valid.json");
});

test("MemoryBrainEventSchema discriminated union accepts all event types", () => {
  MemoryBrainEventSchema.parse(loadFixture("memory-saved-event.valid.json"));
  MemoryBrainEventSchema.parse({
    type: "memory.search",
    query: "report",
    resultCount: 2,
    ts: "2026-05-31T12:00:01.000Z",
    simulated: true,
  });
  MemoryBrainEventSchema.parse({
    type: "memory.contradiction",
    entryId: "a1000000-0000-4000-8000-000000000001",
    supersededId: "a1000000-0000-4000-8000-000000000010",
    ts: "2026-05-31T12:00:02.000Z",
  });
  MemoryBrainEventSchema.parse({
    type: "memory.entity_changed",
    entityId: "b2000000-0000-4000-8000-000000000002",
    entityType: "preference",
    ts: "2026-05-31T12:00:03.000Z",
  });
});

test("MemoryContradictionEventSchema requires both entry ids", () => {
  assert.equal(
    MemoryContradictionEventSchema.safeParse({
      type: "memory.contradiction",
      entryId: "not-a-uuid",
      supersededId: "a1000000-0000-4000-8000-000000000010",
      ts: "2026-05-31T12:00:02.000Z",
    }).success,
    false,
  );
});

test("CockpitSseOutboxSchema fixture round-trip", () => {
  const parsed = roundTrip(CockpitSseOutboxSchema, "cockpit-sse-outbox.valid.json");
  assert.equal(parsed.eventType, "pipeline");
  assert.equal(parsed.deliveredAt, null);
});

test("MemoryTierSchema locks 4-tier model", () => {
  assert.deepEqual(MemoryTierSchema.options, [
    "episodic",
    "semantic",
    "project",
    "procedural",
  ]);
});
