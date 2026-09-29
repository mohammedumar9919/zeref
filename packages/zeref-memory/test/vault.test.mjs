import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);

const { MockMemoryAdapter, toVaultSaveInput, isVaultEntry, toVaultItem, VaultItemSchema } =
  built;

const KINDS = ["confirmed_turn", "rejection", "correction", "pin"];

describe("@zeref/zeref-memory vault helpers", () => {
  it("toVaultSaveInput builds a vault-sourced save with metadata.kind", () => {
    const input = toVaultSaveInput("pin", "  post reels at 7pm  ", { sourceTurnId: "turn-1" });
    assert.equal(input.source, "vault");
    assert.equal(input.content, "post reels at 7pm");
    assert.equal(input.metadata.kind, "pin");
    assert.equal(input.metadata.sourceTurnId, "turn-1");
  });

  it("toVaultSaveInput rejects unknown kinds and empty content", () => {
    assert.throws(() => toVaultSaveInput("memo", "x"));
    assert.throws(() => toVaultSaveInput("pin", "   "));
  });

  it("isVaultEntry requires source=vault and a valid kind", async () => {
    const adapter = new MockMemoryAdapter(false);
    const { entry: vault } = await adapter.saveMemory(toVaultSaveInput("pin", "a"));
    const { entry: plain } = await adapter.saveMemory({ content: "b", source: "voice" });
    const { entry: kindless } = await adapter.saveMemory({ content: "c", source: "vault" });
    assert.equal(isVaultEntry(vault), true);
    assert.equal(isVaultEntry(plain), false);
    assert.equal(isVaultEntry(kindless), false);
    const item = toVaultItem(vault);
    assert.equal(VaultItemSchema.safeParse(item).success, true);
    assert.equal(item.kind, "pin");
  });
});

describe("@zeref/zeref-memory vault (mock adapter)", () => {
  it("saves each kind and lists it back with the correct kind", async () => {
    const adapter = new MockMemoryAdapter(false);
    for (const kind of KINDS) {
      const item = await adapter.saveVaultItem({ kind, content: `item ${kind}` });
      assert.equal(item.kind, kind);
    }
    const all = await adapter.listVaultItems();
    assert.equal(all.length, KINDS.length);
    for (const kind of KINDS) {
      const found = all.find((i) => i.content === `item ${kind}`);
      assert.ok(found, `missing ${kind}`);
      assert.equal(found.kind, kind);
    }
  });

  it("filters by kind and respects limit", async () => {
    const adapter = new MockMemoryAdapter(false);
    await adapter.saveVaultItem({ kind: "pin", content: "pin one" });
    await adapter.saveVaultItem({ kind: "pin", content: "pin two" });
    await adapter.saveVaultItem({ kind: "rejection", content: "no carousels" });

    const pins = await adapter.listVaultItems({ kind: "pin" });
    assert.equal(pins.length, 2);
    assert.ok(pins.every((i) => i.kind === "pin"));

    const limited = await adapter.listVaultItems({ limit: 1 });
    assert.equal(limited.length, 1);
  });

  it("does not list non-vault memory entries", async () => {
    const adapter = new MockMemoryAdapter(true);
    const before = await adapter.listVaultItems();
    assert.equal(before.length, 0);
  });

  it("forget hard-deletes: gone from list and from searchMemory", async () => {
    const adapter = new MockMemoryAdapter(false);
    const item = await adapter.saveVaultItem({ kind: "pin", content: "post reels at 7pm" });

    const hit = await adapter.searchMemory("post reels");
    assert.ok(hit.results.some((r) => r.entry.id === item.id));

    const result = await adapter.forgetVaultItem(item.id);
    assert.deepEqual(result, { deleted: true });

    const listed = await adapter.listVaultItems();
    assert.ok(!listed.some((i) => i.id === item.id));
    const search = await adapter.searchMemory("post reels", { includeContradicted: true });
    assert.ok(!search.results.some((r) => r.entry.id === item.id));

    assert.deepEqual(await adapter.forgetVaultItem(item.id), { deleted: false });
  });

  it("forget of a non-vault entry returns deleted:false and leaves it intact", async () => {
    const adapter = new MockMemoryAdapter(false);
    const { entry } = await adapter.saveMemory({
      content: "voice note about analytics",
      source: "voice",
    });
    const result = await adapter.forgetVaultItem(entry.id);
    assert.deepEqual(result, { deleted: false });
    const search = await adapter.searchMemory("analytics");
    assert.ok(search.results.some((r) => r.entry.id === entry.id));
  });

  it("forget of an unknown or malformed id returns deleted:false", async () => {
    const adapter = new MockMemoryAdapter(false);
    assert.deepEqual(
      await adapter.forgetVaultItem("5f0c7a52-3a6b-4c1e-9d2f-0b6a1c2d3e4f"),
      { deleted: false },
    );
    assert.deepEqual(await adapter.forgetVaultItem("nope"), { deleted: false });
  });
});
