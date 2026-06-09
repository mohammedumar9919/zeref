import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);

const { memorySave, memorySearch } = built;

function clearMemoryEnv() {
  delete process.env.ZEREF_MEMORY_MOCK;
  delete process.env.DATABASE_URL;
}

describe("jarvis-kernel memory tools (Phase 7)", () => {
  after(clearMemoryEnv);

  it("memory_save writes episodic entry and emits memory.saved brainEvent in mock mode", async () => {
    process.env.ZEREF_MEMORY_MOCK = "1";

    const result = await memorySave(
      { summaryText: "User prefers concise answers.", turnId: "550e8400-e29b-41d4-a716-446655440099" },
      { turnId: "550e8400-e29b-41d4-a716-446655440099", transcript: "ignored" },
    );

    assert.equal(result.brainEvent.type, "memory.saved");
    assert.equal(result.brainEvent.tier, "episodic");
    assert.equal(result.brainEvent.simulated, true);
    assert.equal(result.saveResult.entry.source, "voice");
    assert.equal(result.saveResult.entry.tier, "episodic");
  });

  it("memory_search emits memory.search brainEvent in mock mode", async () => {
    process.env.ZEREF_MEMORY_MOCK = "1";

    const result = await memorySearch(
      { query: "report headline", turnId: "550e8400-e29b-41d4-a716-446655440099" },
      { transcript: "ignored" },
    );

    assert.equal(result.brainEvent.type, "memory.search");
    assert.equal(result.brainEvent.query, "report headline");
    assert.equal(result.brainEvent.simulated, true);
    assert.equal(typeof result.brainEvent.resultCount, "number");
    assert.ok(result.brainEvent.resultCount >= 0);
  });
});

