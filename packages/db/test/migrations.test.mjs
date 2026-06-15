import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const dbPkgRoot = join(repoRoot, "packages/db");
const migrationsFolder = join(dbPkgRoot, "drizzle");

const defaultUrl = "postgres://zeref:zeref@localhost:5432/zeref";

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const inspect = spawnSync(
    "docker",
    ["inspect", "-f", "{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}", "zeref-db-1"],
    { encoding: "utf8", shell: true },
  );
  if (inspect.status === 0) {
    const ip = inspect.stdout.trim();
    if (ip) {
      return `postgres://zeref:zeref@${ip}:5432/zeref`;
    }
  }

  return defaultUrl;
}

function dockerAvailable() {
  const res = spawnSync("docker", ["info"], { stdio: "ignore", shell: true });
  return res.status === 0;
}

function composePostgresRunning() {
  const res = spawnSync(
    "docker",
    ["compose", "-f", join(repoRoot, "docker-compose.yml"), "ps", "--services", "--filter", "status=running"],
    { cwd: repoRoot, encoding: "utf8", shell: true },
  );
  return res.status === 0 && res.stdout.includes("db");
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

describe("@zeref/db migrations", { skip: process.env.SKIP_DB_TESTS === "1" }, () => {
  /** @type {pg.Client} */
  let adminClient;
  /** @type {string} */
  let testDbName;
  /** @type {string} */
  let databaseUrl;

  before(async () => {
    if (!existsSync(join(migrationsFolder, "0000_phase1_pipeline.sql"))) {
      throw new Error("Missing migration 0000_phase1_pipeline.sql");
    }

    if (dockerAvailable() && !composePostgresRunning()) {
      spawnSync("docker", ["compose", "up", "-d", "db"], {
        cwd: repoRoot,
        stdio: "inherit",
        shell: true,
      });
      await new Promise((r) => setTimeout(r, 5000));
    }

    databaseUrl = resolveDatabaseUrl();

    async function connectAdmin() {
      const client = new pg.Client({ connectionString: databaseUrl });
      await client.connect();
      return client;
    }

    try {
      adminClient = await connectAdmin();
    } catch (err) {
      if (!dockerAvailable()) {
        throw new Error(
          `Postgres unavailable at ${databaseUrl}. Start docker compose db or set DATABASE_URL. (${err})`,
        );
      }
      databaseUrl = resolveDatabaseUrl();
      adminClient = await connectAdmin();
    }

    await waitForPostgres(adminClient);

    testDbName = `zeref_db_test_${Date.now()}`;
    await adminClient.query(`CREATE DATABASE ${testDbName}`);
  });

  after(async () => {
    if (adminClient) {
      await adminClient.query(`DROP DATABASE IF EXISTS ${testDbName}`);
      await adminClient.end();
    }
  });

  it("applies Phase 1–9 migrations cleanly on Postgres 16", async () => {
    const url = new URL(databaseUrl);
    url.pathname = `/${testDbName}`;
    const testUrl = url.toString();

    const pool = new pg.Pool({ connectionString: testUrl });
    const db = drizzle(pool);

    await migrate(db, { migrationsFolder });

    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [
        [
          "analysis_outputs",
          "calendar_events",
          "cockpit_sse_outbox",
          "embedding_vectors",
          "jarvis_agent_runs",
          "jarvis_audit_log",
          "memory_entities",
          "memory_entries",
          "memory_observations",
          "memory_relations",
          "metric_facts",
          "normalized_entities",
          "platform_accounts",
          "report_artifacts",
          "research_signals",
          "research_topics",
          "snapshots",
          "studio_drafts",
        ],
      ],
    );
    assert.equal(tables.rowCount, 18);

    const ext = await pool.query(
      `SELECT 1 FROM pg_extension WHERE extname = 'vector'`,
    );
    assert.equal(ext.rowCount, 1);

    const embeddingType = await pool.query(
      `SELECT format_type(a.atttypid, a.atttypmod) AS col_type
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       WHERE c.relname = 'embedding_vectors' AND a.attname = 'embedding' AND NOT a.attisdropped`,
    );
    assert.equal(embeddingType.rows[0].col_type, "vector(1536)");

    await pool.end();
  });

  it("enforces snapshot payload immutability (C6)", async () => {
    const url = new URL(databaseUrl);
    url.pathname = `/${testDbName}`;
    const client = new pg.Client({ connectionString: url.toString() });
    await client.connect();

    const account = await client.query(
      `INSERT INTO platform_accounts (platform, external_id, display_name)
       VALUES ('instagram', 'test_handle', 'Test') RETURNING id`,
    );
    const accountId = account.rows[0].id;

    const snap = await client.query(
      `INSERT INTO snapshots (platform_account_id, platform, kind, source_ref, content_hash, payload_json, collected_at)
       VALUES ($1, 'instagram', 'instagram_profile_raw', 'ref-1', 'abc123', '{"v":1}'::jsonb, NOW())
       RETURNING id`,
      [accountId],
    );
    const snapshotId = snap.rows[0].id;

    await assert.rejects(
      () =>
        client.query(`UPDATE snapshots SET payload_json = '{"v":2}'::jsonb WHERE id = $1`, [
          snapshotId,
        ]),
      /immutable/i,
    );

    await client.query(`UPDATE snapshots SET platform_account_id = $1 WHERE id = $2`, [
      accountId,
      snapshotId,
    ]);

    const normalized = await client.query(
      `INSERT INTO normalized_entities (snapshot_id, schema_version, payload_json)
       VALUES ($1, '1.0.0', '{"normalized":true}'::jsonb) RETURNING id`,
      [snapshotId],
    );

    await assert.rejects(
      () =>
        client.query(`UPDATE normalized_entities SET payload_json = '{}'::jsonb WHERE id = $1`, [
          normalized.rows[0].id,
        ]),
      /append-only/i,
    );

    await client.end();
  });

  it("enforces Phase 3 append-only and FK integrity (Q3, C16)", async () => {
    const url = new URL(databaseUrl);
    url.pathname = `/${testDbName}`;
    const client = new pg.Client({ connectionString: url.toString() });
    await client.connect();

    const account = await client.query(
      `INSERT INTO platform_accounts (platform, external_id)
       VALUES ('instagram', 'phase3_account') RETURNING id`,
    );
    const accountId = account.rows[0].id;

    const snap = await client.query(
      `INSERT INTO snapshots (platform_account_id, platform, kind, source_ref, content_hash, payload_json, collected_at)
       VALUES ($1, 'instagram', 'instagram_post_raw', 'ref-p3', 'hash-p3', '{}'::jsonb, NOW()) RETURNING id`,
      [accountId],
    );
    const snapshotId = snap.rows[0].id;

    const normalized = await client.query(
      `INSERT INTO normalized_entities (snapshot_id, schema_version, payload_json)
       VALUES ($1, 'phase3-v1', '{"text":"embed me"}'::jsonb) RETURNING id`,
      [snapshotId],
    );
    const normalizedId = normalized.rows[0].id;

    const facts = await client.query(
      `INSERT INTO metric_facts (snapshot_id, normalized_entity_id, platform_account_id, metric_version, engagement_score, insufficient_data)
       VALUES ($1, $2, $3, 'phase3-v1', 0.42, false) RETURNING id`,
      [snapshotId, normalizedId, accountId],
    );

    await assert.rejects(
      () =>
        client.query(`UPDATE metric_facts SET engagement_score = 0 WHERE id = $1`, [
          facts.rows[0].id,
        ]),
      /append-only/i,
    );

    const zeros = Array.from({ length: 1536 }, () => 0);
    const vectorLiteral = `[${zeros.join(",")}]`;

    await client.query(
      `INSERT INTO embedding_vectors (normalized_entity_id, model, dimensions, embedding, content_hash)
       VALUES ($1, 'text-embedding-3-small', 1536, $2::vector, 'content-hash-1')`,
      [normalizedId, vectorLiteral],
    );

    await assert.rejects(
      () =>
        client.query(
          `INSERT INTO embedding_vectors (normalized_entity_id, model, dimensions, embedding, content_hash)
           VALUES ($1, 'text-embedding-3-small', 768, $2::vector, 'bad-dim')`,
          [normalizedId, vectorLiteral],
        ),
      /dimensions_chk|vector/i,
    );

    await assert.rejects(
      () =>
        client.query(
          `INSERT INTO metric_facts (snapshot_id, normalized_entity_id, platform_account_id, metric_version)
           VALUES ($1, $2, $3, 'phase3-v1')`,
          [snapshotId, normalizedId, "00000000-0000-0000-0000-000000000099"],
        ),
      /foreign key|violates/i,
    );

    await client.end();
  });

  it("supports studio drafts without snapshot mutation (C78)", async () => {
    const url = new URL(databaseUrl);
    url.pathname = `/${testDbName}`;
    const client = new pg.Client({ connectionString: url.toString() });
    await client.connect();

    const account = await client.query(
      `INSERT INTO platform_accounts (platform, external_id)
       VALUES ('instagram', 'phase8_studio') RETURNING id`,
    );
    const accountId = account.rows[0].id;

    const snap = await client.query(
      `INSERT INTO snapshots (platform_account_id, platform, kind, source_ref, content_hash, payload_json, collected_at)
       VALUES ($1, 'instagram', 'instagram_post_raw', 'ref-p8', 'hash-p8', '{"caption":"immutable"}'::jsonb, NOW()) RETURNING id`,
      [accountId],
    );
    const snapshotId = snap.rows[0].id;

    const normalized = await client.query(
      `INSERT INTO normalized_entities (snapshot_id, schema_version, payload_json)
       VALUES ($1, 'phase8-v1', '{"text":"studio entity"}'::jsonb) RETURNING id`,
      [snapshotId],
    );
    const entityId = normalized.rows[0].id;

    await client.query(
      `INSERT INTO studio_drafts (entity_id, caption, notes, tags_json)
       VALUES ($1, 'draft caption', 'draft notes', '["tag-a"]'::jsonb)`,
      [entityId],
    );

    const snapshotAfter = await client.query(
      `SELECT payload_json FROM snapshots WHERE id = $1`,
      [snapshotId],
    );
    assert.deepEqual(snapshotAfter.rows[0].payload_json, { caption: "immutable" });

    await assert.rejects(
      () =>
        client.query(`UPDATE snapshots SET payload_json = '{"v":2}'::jsonb WHERE id = $1`, [
          snapshotId,
        ]),
      /immutable/i,
    );

    await client.end();
  });

  it("supports research topics + signals without snapshot mutation (C83)", async () => {
    const url = new URL(databaseUrl);
    url.pathname = `/${testDbName}`;
    const client = new pg.Client({ connectionString: url.toString() });
    await client.connect();

    const account = await client.query(
      `INSERT INTO platform_accounts (platform, external_id)
       VALUES ('instagram', 'phase9_research') RETURNING id`,
    );
    const accountId = account.rows[0].id;

    const snap = await client.query(
      `INSERT INTO snapshots (platform_account_id, platform, kind, source_ref, content_hash, payload_json, collected_at)
       VALUES ($1, 'instagram', 'instagram_post_raw', 'ref-p9', 'hash-p9', '{"caption":"immutable"}'::jsonb, NOW()) RETURNING id`,
      [accountId],
    );
    const snapshotId = snap.rows[0].id;

    const normalized = await client.query(
      `INSERT INTO normalized_entities (snapshot_id, schema_version, payload_json)
       VALUES ($1, 'phase9-v1', '{"text":"research entity"}'::jsonb) RETURNING id`,
      [snapshotId],
    );
    const entityId = normalized.rows[0].id;

    const topic = await client.query(
      `INSERT INTO research_topics (title, scope_entity_id)
       VALUES ('Phase 9 fixture topic', $1) RETURNING id`,
      [entityId],
    );
    const topicId = topic.rows[0].id;

    await client.query(
      `INSERT INTO research_signals (topic_id, source_entity_id, source_snapshot_id, signal_type, score, computed_at)
       VALUES ($1, $2, $3, 'engagement_delta', 0.55, NOW())`,
      [topicId, entityId, snapshotId],
    );

    const snapshotAfter = await client.query(
      `SELECT payload_json FROM snapshots WHERE id = $1`,
      [snapshotId],
    );
    assert.deepEqual(snapshotAfter.rows[0].payload_json, { caption: "immutable" });

    await assert.rejects(
      () =>
        client.query(`UPDATE snapshots SET payload_json = '{"v":2}'::jsonb WHERE id = $1`, [
          snapshotId,
        ]),
      /immutable/i,
    );

    await client.end();
  });
});
