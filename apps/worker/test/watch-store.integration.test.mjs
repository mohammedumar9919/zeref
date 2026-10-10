import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const testDir = dirname(fileURLToPath(import.meta.url));
const workerRoot = join(testDir, "..");
const migrationsFolder = join(workerRoot, "../../packages/db/drizzle");
const databaseUrl = process.env.DATABASE_URL ?? "postgres://zeref:zeref@localhost:35432/zeref";

async function postgresReachable() {
  if (process.env.SKIP_DB_TESTS === "1") return "SKIP_DB_TESTS=1";
  const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return false;
  } catch {
    return `Postgres unreachable at ${databaseUrl.replace(/:[^:@/]+@/, ":***@")}`;
  } finally {
    await client.end().catch(() => {});
  }
}

const skip = await postgresReachable();

describe("@zeref/worker watch store (Postgres)", { skip }, () => {
  /** @type {pg.Pool} */
  let pool;
  let testDbName;
  let worker;

  before(async () => {
    const admin = new pg.Client({ connectionString: databaseUrl });
    await admin.connect();
    testDbName = `zeref_watch_test_${Date.now()}`;
    await admin.query(`CREATE DATABASE ${testDbName}`);
    await admin.end();

    const url = new URL(databaseUrl);
    url.pathname = `/${testDbName}`;
    pool = new pg.Pool({ connectionString: url.toString(), max: 6 });
    await migrate(drizzle(pool), { migrationsFolder });
    worker = await import(pathToFileURL(join(workerRoot, "dist/index.js")).href);
  });

  after(async () => {
    if (!pool) return;
    await pool.end();
    const admin = new pg.Client({ connectionString: databaseUrl });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await admin.end();
  });

  it("advisory lock admits one holder at a time", async () => {
    const a = worker.createPgWatchStore(pool);
    const b = worker.createPgWatchStore(pool);
    const lock = await a.tryAcquireLock();
    assert.ok(lock);
    assert.equal(await b.tryAcquireLock(), null);
    await lock.release();
    const again = await b.tryAcquireLock();
    assert.ok(again);
    await again.release();
  });

  it("persists runs, sums today's graph calls, and reads latest snapshots + media list", async () => {
    const store = worker.createPgWatchStore(pool);
    const startedAt = new Date();
    const id = await store.insertRun({ trigger: "schedule", startedAt, status: "running" });
    await store.finishRun(id, {
      status: "ok",
      finishedAt: new Date(),
      graphCalls: 3,
      maxUsagePct: 12.5,
      tokenExpiresAt: null,
      tokenCheckedAt: startedAt,
      errorCode: null,
      diffJson: { media: [{ id: "m1" }], mediaListCollectedAt: startedAt.toISOString(), posts: [] },
    });
    await store.insertRun({
      trigger: "task_scheduler",
      startedAt,
      status: "skipped_locked",
      finishedAt: new Date(),
    });

    const dayStart = worker.utcDayStart(startedAt);
    assert.equal(await store.graphCallsSince(dayStart), 3);
    assert.equal(await store.tokenCheckedSince(dayStart), true);
    const list = await store.lastMediaList();
    assert.deepEqual(list.media, [{ id: "m1" }]);

    for (const [hash, at, likes] of [
      ["h1", "2026-10-08T08:00:00Z", 10],
      ["h2", "2026-10-09T08:00:00Z", 15],
    ]) {
      await pool.query(
        `INSERT INTO snapshots (platform, kind, source_ref, content_hash, payload_json, collected_at)
         VALUES ('instagram', 'instagram_post_raw', 'instagram:post:W1', $1, $2::jsonb, $3)`,
        [hash, JSON.stringify({ shortcode: "W1", graph: { like_count: likes } }), at],
      );
    }
    const snaps = await store.latestSnapshots("instagram:post:W1", 2);
    assert.equal(snaps.length, 2);
    assert.equal(snaps[0].collectedAt.toISOString(), "2026-10-09T08:00:00.000Z");
    const d = worker.diffSnapshotPair(snaps[0], snaps[1], { newThisRun: true });
    assert.deepEqual(d.delta, { likes: 5 });

    await assert.rejects(
      () => store.insertRun({ trigger: "cron", startedAt, status: "ok" }),
      /watch_runs_trigger_chk/,
    );
  });
});
