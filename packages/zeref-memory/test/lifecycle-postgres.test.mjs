import { after, before, describe } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { registerLifecycleBehaviour } from "./lifecycle-behaviour.mjs";

const databaseUrl = process.env.DATABASE_URL;
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("@zeref/zeref-memory lifecycle (postgres adapter, C19a)", { skip: !databaseUrl }, () => {
  let pool;
  let adapter;
  let schemaReady = false;
  const createdIds = [];
  const entityIds = [];

  before(async () => {
    const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);
    const pg = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { schema } = await import("@zeref/db/schema");
    pool = new pg.default.Pool({ connectionString: databaseUrl });
    const probe = await pool.query(
      `select count(*)::int as n from information_schema.columns
       where table_name = 'memory_entries' and column_name in ('superseded_by', 'archived_at')`,
    );
    schemaReady = probe.rows[0]?.n === 2;
    adapter = built.createPostgresMemoryAdapter(drizzle(pool, { schema }));
  });

  after(async () => {
    if (pool && schemaReady) {
      if (createdIds.length > 0) {
        await pool.query("delete from memory_entries where id = any($1::uuid[])", [createdIds]);
      }
      if (entityIds.length > 0) {
        await pool.query("delete from memory_entities where id = any($1::uuid[])", [entityIds]);
      }
    }
    await pool?.end();
  });

  registerLifecycleBehaviour({
    adapter: () => adapter,
    track: (id) => createdIds.push(id),
    trackEntity: (id) => entityIds.push(id),
    ready: async () => schemaReady,
  });
});
