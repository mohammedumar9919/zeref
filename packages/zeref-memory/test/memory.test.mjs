import assert from "node:assert/strict";
import { describe, it, before, afterEach } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);

const {
  saveMemory,
  searchMemory,
  verifyMemory,
  createEntity,
  updateEntity,
  queryEntities,
  relateEntities,
  resetMemoryAdapterCache,
  isMemoryMockMode,
  MockMemoryAdapter,
} = built;

describe("@zeref/zeref-memory mock adapter", () => {
  const originalEnv = { ...process.env };

  before(() => {
    process.env.ZEREF_MEMORY_MOCK = "1";
    resetMemoryAdapterCache();
  });

  afterEach(() => {
    resetMemoryAdapterCache();
    process.env.ZEREF_MEMORY_MOCK = "1";
  });

  it("isMemoryMockMode returns true when ZEREF_MEMORY_MOCK=1", () => {
    assert.equal(isMemoryMockMode(), true);
  });

  it("searchMemory returns fixture results for report headline query", async () => {
    const result = await searchMemory("report headline");
    assert.ok(result.totalCount >= 1);
    assert.match(result.results[0].entry.content, /report headline/i);
  });

  it("saveMemory auto-classifies voice source as episodic", async () => {
    const { entry } = await saveMemory({
      content: "Remember this voice turn about analytics.",
      source: "voice",
    });
    assert.equal(entry.tier, "episodic");
    assert.equal(entry.observation, "verified");
  });

  it("saveMemory marks older entry contradicted on conflicting entity value", async () => {
    resetMemoryAdapterCache();
    const adapter = new MockMemoryAdapter(false);

    const entity = await adapter.createEntity({
      type: "preference",
      name: "theme",
    });

    const first = await adapter.saveMemory({
      content: "User prefers dark theme.",
      source: "voice",
      entityId: entity.id,
      valueKey: "theme",
      value: "dark",
      tier: "semantic",
    });

    const second = await adapter.saveMemory({
      content: "User prefers light theme.",
      source: "voice",
      entityId: entity.id,
      valueKey: "theme",
      value: "light",
      tier: "semantic",
    });

    assert.equal(second.contradictions.length, 1);
    assert.equal(second.contradictions[0].supersededId, first.entry.id);

    const search = await adapter.searchMemory("theme", { includeContradicted: true });
    const superseded = search.results.find((r) => r.entry.id === first.entry.id);
    assert.ok(superseded);
    assert.equal(superseded.entry.observation, "contradicted");
  });

  it("createEntity, updateEntity, queryEntities, relateEntities work", async () => {
    resetMemoryAdapterCache();
    const adapter = new MockMemoryAdapter(false);

    const a = await adapter.createEntity({ type: "project", name: "alpha" });
    const b = await adapter.createEntity({ type: "project", name: "beta" });

    const updated = await adapter.updateEntity({
      entityId: a.id,
      patch: { status: "active" },
    });
    assert.equal(updated.stateJson.status, "active");
    assert.equal(updated.transitionHistory.length, 1);

    const queried = await adapter.queryEntities({ type: "project" });
    assert.equal(queried.length, 2);

    const relation = await adapter.relateEntities({
      fromEntityId: a.id,
      toEntityId: b.id,
      relationType: "depends_on",
    });
    assert.equal(relation.relationType, "depends_on");
  });

  it("verifyMemory updates observation on fixture entry", async () => {
    const search = await searchMemory("report headline");
    const entryId = search.results[0].entry.id;
    const stale = await verifyMemory({ entryId, observation: "stale" });
    assert.equal(stale.observation, "stale");
  });
});
