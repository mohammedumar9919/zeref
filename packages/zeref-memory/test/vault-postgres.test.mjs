import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("@zeref/zeref-memory vault (postgres adapter)", { skip: !databaseUrl }, () => {
  let pool;
  let db;
  let adapter;
  let schemaReady = false;
  const createdIds = [];

  before(async () => {
    const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);
    const pg = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { schema } = await import("@zeref/db/schema");
    pool = new pg.default.Pool({ connectionString: databaseUrl });
    const probe = await pool.query(
      "select to_regclass('public.memory_entries') is not null and to_regclass('public.memory_observations') is not null as ready",
    );
    schemaReady = probe.rows[0]?.ready === true;
    db = drizzle(pool, { schema });
    adapter = built.createPostgresMemoryAdapter(db);
  });

  after(async () => {
    if (pool && schemaReady && createdIds.length > 0) {
      await pool.query("delete from memory_entries where id = any($1::uuid[])", [createdIds]);
    }
    await pool?.end();
  });

  it("saves, lists by kind, and forgets vault items (observations removed)", async (t) => {
    if (!schemaReady) {
      t.skip("memory tables not migrated");
      return;
    }

    const pin = await adapter.saveVaultItem({
      kind: "pin",
      content: `c3 vault pg pin ${Date.now()}`,
      sourceTurnId: "turn-pg-1",
    });
    const rejection = await adapter.saveVaultItem({
      kind: "rejection",
      content: `c3 vault pg rejection ${Date.now()}`,
    });
    createdIds.push(pin.id, rejection.id);
    assert.equal(pin.kind, "pin");
    assert.equal(pin.sourceTurnId, "turn-pg-1");

    const pins = await adapter.listVaultItems({ kind: "pin", limit: 500 });
    assert.ok(pins.some((i) => i.id === pin.id));
    assert.ok(!pins.some((i) => i.id === rejection.id));

    await pool.query(
      "insert into memory_observations (entry_id, observation_type, metadata_json) values ($1, 'contradiction', '{}'::jsonb)",
      [pin.id],
    );

    const result = await adapter.forgetVaultItem(pin.id);
    assert.deepEqual(result, { deleted: true });

    const rows = await pool.query("select 1 from memory_entries where id = $1", [pin.id]);
    assert.equal(rows.rowCount, 0);
    const obs = await pool.query("select 1 from memory_observations where entry_id = $1", [
      pin.id,
    ]);
    assert.equal(obs.rowCount, 0);

    const after = await adapter.listVaultItems({ limit: 500 });
    assert.ok(!after.some((i) => i.id === pin.id));
    assert.ok(after.some((i) => i.id === rejection.id));
  });

  it("refuses to forget non-vault entries", async (t) => {
    if (!schemaReady) {
      t.skip("memory tables not migrated");
      return;
    }
    const { entry } = await adapter.saveMemory({
      content: `c3 vault pg voice ${Date.now()}`,
      source: "voice",
    });
    createdIds.push(entry.id);

    assert.deepEqual(await adapter.forgetVaultItem(entry.id), { deleted: false });
    const rows = await pool.query("select 1 from memory_entries where id = $1", [entry.id]);
    assert.equal(rows.rowCount, 1);
    assert.deepEqual(await adapter.forgetVaultItem("not-a-uuid"), { deleted: false });
  });
});
