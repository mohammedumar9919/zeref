import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const testDir = dirname(fileURLToPath(import.meta.url));
const workerRoot = join(testDir, "..");
const repoRoot = join(workerRoot, "../..");
const dbPkgRoot = join(repoRoot, "packages/db");
const migrationsFolder = join(dbPkgRoot, "drizzle");
const metricsFixtures = join(repoRoot, "fixtures/phase-3/metrics");

const defaultUrl = "postgres://zeref:zeref@localhost:35432/zeref";

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return defaultUrl;
}

function dockerAvailable() {
  const res = spawnSync("docker", ["info"], { stdio: "ignore", shell: true });
  return res.status === 0;
}

async function waitForPostgres(client, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await client.query("SELECT 1");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Postgres did not become ready");
}

describe("@zeref/worker normalize + embed integration", { skip: process.env.SKIP_DB_TESTS === "1" }, () => {
  /** @type {pg.Pool} */
  let pool;
  /** @type {string} */
  let testDbName;
  /** @type {string} */
  let databaseUrl;
  /** @type {import('../dist/jobs/normalize.js').runNormalize} */
  let runNormalize;
  /** @type {import('../dist/jobs/embed.js').runEmbed} */
  let runEmbed;
  /** @type {string} */
  let platformAccountId;
  /** @type {string} */
  let snapshotId;

  before(async () => {
    if (!existsSync(join(migrationsFolder, "0001_phase3_analytics_embeddings.sql"))) {
      throw new Error("Missing migration 0001_phase3_analytics_embeddings.sql");
    }

    databaseUrl = resolveDatabaseUrl();
    const admin = new pg.Client({ connectionString: databaseUrl });
    try {
      await admin.connect();
    } catch (err) {
      if (!dockerAvailable()) {
        throw new Error(
          `Postgres unavailable at ${databaseUrl}. Set DATABASE_URL or start docker compose db. (${err})`,
        );
      }
      throw err;
    }
    await waitForPostgres(admin);
    testDbName = `zeref_worker_p3_${Date.now()}`;
    await admin.query(`CREATE DATABASE ${testDbName}`);
    await admin.end();

    const testUrl = new URL(databaseUrl);
    testUrl.pathname = `/${testDbName}`;
    pool = new pg.Pool({ connectionString: testUrl.toString() });
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder });

    const account = await pool.query(
      `INSERT INTO platform_accounts (platform, external_id, display_name)
       VALUES ('instagram', 'phase3_fixture', 'Phase 3') RETURNING id`,
    );
    platformAccountId = account.rows[0].id;

    const merged = JSON.parse(
      readFileSync(join(metricsFixtures, "ride-log.json"), "utf8"),
    ).input;

    const snap = await pool.query(
      `INSERT INTO snapshots (platform_account_id, platform, kind, source_ref, content_hash, payload_json, collected_at)
       VALUES ($1, 'instagram', 'instagram_post_raw', 'instagram:post:LOG240', 'sha256:test-phase3', $2::jsonb, NOW())
       RETURNING id`,
      [platformAccountId, JSON.stringify(merged)],
    );
    snapshotId = snap.rows[0].id;

    const builtNormalize = await import(
      pathToFileURL(join(workerRoot, "dist/jobs/normalize.js")).href
    );
    const builtEmbed = await import(
      pathToFileURL(join(workerRoot, "dist/jobs/embed.js")).href
    );
    runNormalize = builtNormalize.runNormalize;
    runEmbed = builtEmbed.runEmbed;
  });

  after(async () => {
    if (pool) {
      const admin = new pg.Client({ connectionString: databaseUrl });
      await admin.connect();
      await pool.end();
      await admin.query(`DROP DATABASE IF EXISTS ${testDbName}`);
      await admin.end();
    }
  });

  it("normalize INSERTs normalized_entities + metric_facts with platform_account_id", async () => {
    const output = await runNormalize(
      {
        jobType: "normalize",
        snapshotId,
        schemaVersion: "phase3-v1",
      },
      { pool, autoEmbed: false },
    );

    assert.equal(output.snapshotId, snapshotId);
    assert.equal(output.platformAccountId, platformAccountId);
    assert.equal(output.insufficientData, false);
    assert.ok(output.metricFactId);

    const entity = await pool.query(
      `SELECT payload_json FROM normalized_entities WHERE id = $1`,
      [output.normalizedEntityId],
    );
    assert.equal(entity.rows[0].payload_json.shortcode, "LOG240");

    const facts = await pool.query(
      `SELECT engagement_score, niche_tags, insufficient_data FROM metric_facts WHERE id = $1`,
      [output.metricFactId],
    );
    assert.equal(facts.rows[0].insufficient_data, false);
    assert.deepEqual(facts.rows[0].niche_tags, ["ride_log"]);
    assert.ok(Number(facts.rows[0].engagement_score) > 0);
  });

  it("embed INSERTs embedding_vectors (1536) from normalized entity only", async () => {
    const normalized = await runNormalize(
      {
        jobType: "normalize",
        snapshotId,
        schemaVersion: "phase3-v1",
      },
      { pool, autoEmbed: false },
    );

    const embedOut = await runEmbed(
      {
        jobType: "embed",
        normalizedEntityId: normalized.normalizedEntityId,
        model: "text-embedding-3-small",
        schemaVersion: "phase3-v1",
      },
      { pool },
    );

    assert.match(embedOut.contentHash, /^sha256:[a-f0-9]{64}$/);
    assert.equal(embedOut.dimensions, 1536);

    const row = await pool.query(
      `SELECT dimensions, model,
        (SELECT format_type(a.atttypid, a.atttypmod)
         FROM pg_attribute a
         JOIN pg_class c ON a.attrelid = c.oid
         WHERE c.relname = 'embedding_vectors' AND a.attname = 'embedding' AND NOT a.attisdropped) AS col_type
       FROM embedding_vectors WHERE id = $1`,
      [embedOut.embeddingVectorId],
    );
    assert.equal(row.rows[0].dimensions, 1536);
    assert.equal(row.rows[0].model, "text-embedding-3-small");
    assert.equal(row.rows[0].col_type, "vector(1536)");
  });

  it("auto-chains embed after normalize when ZEREF_AUTO_EMBED is enabled", async () => {
    const prev = process.env.ZEREF_AUTO_EMBED;
    process.env.ZEREF_AUTO_EMBED = "1";

    const merged = JSON.parse(
      readFileSync(join(metricsFixtures, "edits-reel.json"), "utf8"),
    ).input;
    const snap = await pool.query(
      `INSERT INTO snapshots (platform_account_id, platform, kind, source_ref, content_hash, payload_json, collected_at)
       VALUES ($1, 'instagram', 'instagram_post_raw', 'instagram:post:EDITS01', 'sha256:edits-reel', $2::jsonb, NOW())
       RETURNING id`,
      [platformAccountId, JSON.stringify(merged)],
    );

    const output = await runNormalize(
      {
        jobType: "normalize",
        snapshotId: snap.rows[0].id,
        schemaVersion: "phase3-v1",
      },
      { pool },
    );

    const embedCount = await pool.query(
      `SELECT COUNT(*)::int AS n FROM embedding_vectors WHERE normalized_entity_id = $1`,
      [output.normalizedEntityId],
    );
    assert.equal(embedCount.rows[0].n, 1);

    if (prev === undefined) delete process.env.ZEREF_AUTO_EMBED;
    else process.env.ZEREF_AUTO_EMBED = prev;
  });

  it("enforces append-only immutability on normalized_entities, metric_facts, embedding_vectors (C6)", async () => {
    const normalized = await runNormalize(
      {
        jobType: "normalize",
        snapshotId,
        schemaVersion: "phase3-v1",
      },
      { pool, autoEmbed: false },
    );

    await assert.rejects(
      () =>
        pool.query(`UPDATE normalized_entities SET payload_json = '{}'::jsonb WHERE id = $1`, [
          normalized.normalizedEntityId,
        ]),
      /append-only/i,
    );

    await assert.rejects(
      () =>
        pool.query(`UPDATE metric_facts SET engagement_score = 0 WHERE id = $1`, [
          normalized.metricFactId,
        ]),
      /append-only/i,
    );

    const embedOut = await runEmbed(
      {
        jobType: "embed",
        normalizedEntityId: normalized.normalizedEntityId,
        schemaVersion: "phase3-v1",
      },
      { pool },
    );

    await assert.rejects(
      () =>
        pool.query(`UPDATE embedding_vectors SET content_hash = 'tamper' WHERE id = $1`, [
          embedOut.embeddingVectorId,
        ]),
      /append-only/i,
    );
  });
});
