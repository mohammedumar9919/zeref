import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { registerLifecycleBehaviour } from "./lifecycle-behaviour.mjs";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);
const { MockMemoryAdapter, PostgresMemoryAdapter } = built;

describe("@zeref/zeref-memory lifecycle (mock adapter, C19a)", () => {
  const adapter = new MockMemoryAdapter(false);
  registerLifecycleBehaviour({
    adapter: () => adapter,
    track: () => {},
    ready: async () => true,
  });

  it("fixture-seeded store: nothing archived or superseded until asked", async () => {
    const seeded = new MockMemoryAdapter(true);
    const before = await seeded.searchMemory("", { limit: 1000, includeContradicted: true });
    const withArchived = await seeded.searchMemory("", {
      limit: 1000,
      includeContradicted: true,
      includeArchived: true,
    });
    assert.equal(before.totalCount, withArchived.totalCount);
    for (const { entry } of before.results) {
      const [row] = await seeded.getEntryHistory(entry.id);
      assert.equal(row.archivedAt, null);
    }
  });

  it("lifecycle fields never leak into MemoryEntry results (strict contract)", async () => {
    const local = new MockMemoryAdapter(false);
    const { entry } = await local.saveMemory({ content: "strict contract", source: "manual" });
    const { entry: next } = await local.supersedeEntry(entry.id, { content: "strict contract 2" });
    await local.archiveEntries([next.id]);
    const found = await local.searchMemory("strict", {
      includeArchived: true,
      includeContradicted: true,
    });
    for (const { entry: e } of found.results) {
      built.MemoryEntrySchema.parse(e);
      assert.ok(!("supersededBy" in e) && !("archivedAt" in e));
    }
  });
});

describe("@zeref/zeref-memory lifecycle never deletes (C19a)", () => {
  const methods = ["supersedeEntry", "archiveEntries", "proposeStaleArchive", "getEntryHistory"];

  for (const [name, Adapter] of [
    ["mock", MockMemoryAdapter],
    ["postgres", PostgresMemoryAdapter],
  ]) {
    it(`${name} lifecycle methods contain no delete path`, () => {
      const helpers = ["markSuperseded", "setLifecycle"].filter(
        (h) => typeof Adapter.prototype[h] === "function",
      );
      for (const method of [...methods, ...helpers]) {
        const source = Adapter.prototype[method].toString();
        assert.doesNotMatch(source, /\.delete\(|splice\(|DELETE\s+FROM|\.clear\(/i, `${name}.${method}`);
      }
    });
  }

  it("postgres proposeStaleArchive only reads", () => {
    const source = PostgresMemoryAdapter.prototype.proposeStaleArchive.toString();
    assert.doesNotMatch(source, /\.(update|insert|delete|transaction)\(/);
  });
});
