import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = "mock-sha256-c4-test";

/** Deterministic 1536-d sha256 vector: equal text → equal vector; carries no meaning. */
function mockVector(text) {
  const vec = [];
  let round = 0;
  while (vec.length < 1536) {
    for (const byte of createHash("sha256").update(`${text}\0${round}`).digest()) {
      vec.push(byte / 127.5 - 1);
      if (vec.length >= 1536) break;
    }
    round += 1;
  }
  return vec;
}

describe("@zeref/zeref-memory vector recall (postgres adapter, CLOUD-C4)", { skip: !databaseUrl }, () => {
  let pool;
  let db;
  let built;
  let schemaReady = false;
  const createdIds = [];
  const embedCalls = [];
  const embed = async (text) => {
    embedCalls.push(text);
    return mockVector(text);
  };

  before(async () => {
    built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);
    const pg = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { schema } = await import("@zeref/db/schema");
    pool = new pg.default.Pool({ connectionString: databaseUrl });
    const probe = await pool.query(
      "select to_regclass('public.memory_entries') is not null and to_regclass('public.memory_entry_embeddings') is not null as ready",
    );
    schemaReady = probe.rows[0]?.ready === true;
    db = drizzle(pool, { schema });
  });

  after(async () => {
    if (pool && schemaReady && createdIds.length > 0) {
      await pool.query("delete from memory_entries where id = any($1::uuid[])", [createdIds]);
    }
    await pool?.end();
  });

  async function embeddingRow(entryId) {
    const res = await pool.query(
      "select model, content_hash from memory_entry_embeddings where entry_id = $1",
      [entryId],
    );
    return res.rows[0];
  }

  it("stores one embedding row per saved entry", async (t) => {
    if (!schemaReady) return t.skip("memory_entry_embeddings not migrated");
    const adapter = built.createPostgresMemoryAdapter(db, { embed, embedModel: MODEL });
    const content = `c4 save row ${Date.now()}`;
    const { entry } = await adapter.saveMemory({ content, source: "voice" });
    createdIds.push(entry.id);

    assert.ok(embedCalls.includes(content));
    const row = await embeddingRow(entry.id);
    assert.equal(row.model, MODEL);
    assert.match(row.content_hash, /^sha256:[0-9a-f]{64}$/);
  });

  it("removes the embedding when a vault item is forgotten (cascade)", async (t) => {
    if (!schemaReady) return t.skip("memory_entry_embeddings not migrated");
    const adapter = built.createPostgresMemoryAdapter(db, { embed, embedModel: MODEL });
    const pin = await adapter.saveVaultItem({ kind: "pin", content: `c4 forget pin ${Date.now()}` });
    createdIds.push(pin.id);
    assert.ok(await embeddingRow(pin.id));

    assert.deepEqual(await adapter.forgetVaultItem(pin.id), { deleted: true });
    assert.equal(await embeddingRow(pin.id), undefined);
  });

  it("returns the exact-text hit first with hybrid scores", async (t) => {
    if (!schemaReady) return t.skip("memory_entry_embeddings not migrated");
    const adapter = built.createPostgresMemoryAdapter(db, { embed, embedModel: MODEL });
    const tag = `c4exact${Date.now()}`;
    const target = `${tag} what I pinned about reels`;
    const decoys = [`${tag} decoy one`, `${tag} decoy two`];
    for (const content of [...decoys, target]) {
      const { entry } = await adapter.saveMemory({ content, source: "vault" });
      createdIds.push(entry.id);
    }

    const result = await adapter.searchMemory(target, { limit: 5 });
    assert.equal(result.results[0].entry.content, target);
    // lexical rank 1 + vector rank 1 (identical vector) under RRF k=60
    assert.equal(result.results[0].score, 2 / 61);
  });

  it("keeps lexical matches in the fused list (never vector-only)", async (t) => {
    if (!schemaReady) return t.skip("memory_entry_embeddings not migrated");
    const adapter = built.createPostgresMemoryAdapter(db, { embed, embedModel: MODEL });
    const tag = `c4lex${Date.now()}`;
    const { entry } = await adapter.saveMemory({ content: `${tag} lexical only`, source: "voice" });
    createdIds.push(entry.id);

    const result = await adapter.searchMemory(tag, { limit: 50 });
    assert.ok(result.results.some((r) => r.entry.id === entry.id));
  });

  it("saves without an embedding and searches lexically when embed fails", async (t) => {
    if (!schemaReady) return t.skip("memory_entry_embeddings not migrated");
    const failing = built.createPostgresMemoryAdapter(db, {
      embed: async () => {
        throw new Error("embed provider down");
      },
      embedModel: MODEL,
    });
    const content = `c4 embed-fail ${Date.now()}`;
    const { entry } = await failing.saveMemory({ content, source: "voice" });
    createdIds.push(entry.id);
    assert.equal(await embeddingRow(entry.id), undefined);

    const result = await failing.searchMemory(content, { limit: 5 });
    assert.equal(result.results[0].entry.id, entry.id);
    assert.equal(result.results[0].score, result.results[0].entry.temporalScore);
  });

  it("without embed: no embedding row and lexical-only search", async (t) => {
    if (!schemaReady) return t.skip("memory_entry_embeddings not migrated");
    const lexicalOnly = built.createPostgresMemoryAdapter(db);
    const content = `c4 no-embed ${Date.now()}`;
    const { entry } = await lexicalOnly.saveMemory({ content, source: "voice" });
    createdIds.push(entry.id);
    assert.equal(await embeddingRow(entry.id), undefined);

    const result = await lexicalOnly.searchMemory(content, { limit: 5 });
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].entry.id, entry.id);
  });

  it("useEmbedder attaches an embedder to an existing adapter", async (t) => {
    if (!schemaReady) return t.skip("memory_entry_embeddings not migrated");
    const adapter = built.createPostgresMemoryAdapter(db);
    adapter.useEmbedder(embed, MODEL);
    const { entry } = await adapter.saveMemory({ content: `c4 attach ${Date.now()}`, source: "voice" });
    createdIds.push(entry.id);
    assert.equal((await embeddingRow(entry.id)).model, MODEL);
  });
});
