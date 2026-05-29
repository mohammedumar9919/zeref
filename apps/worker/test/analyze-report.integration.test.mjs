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
  return process.env.DATABASE_URL ?? defaultUrl;
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

describe("@zeref/worker analyze + report integration", { skip: process.env.SKIP_DB_TESTS === "1" }, () => {
  /** @type {pg.Pool} */
  let pool;
  let testDbName;
  let databaseUrl;
  /** @type {import('../dist/jobs/normalize.js').runNormalize} */
  let runNormalize;
  /** @type {import('../dist/jobs/analyze.js').runAnalyze} */
  let runAnalyze;
  /** @type {import('../dist/jobs/report.js').runReport} */
  let runReport;
  let platformAccountId;
  let snapshotId;
  let normalizedEntityId;

  before(async () => {
    process.env.ZEREF_LLM_MOCK = "1";
    process.env.ZEREF_AUTO_EMBED = "0";
    process.env.ZEREF_AUTO_REPORT = "0";

    if (!existsSync(join(migrationsFolder, "0001_phase3_analytics_embeddings.sql"))) {
      throw new Error("Missing migration 0001_phase3_analytics_embeddings.sql");
    }

    databaseUrl = resolveDatabaseUrl();
    const admin = new pg.Client({ connectionString: databaseUrl });
    try {
      await admin.connect();
    } catch (err) {
      if (!dockerAvailable()) {
        throw new Error(`Postgres unavailable at ${databaseUrl} (${err})`);
      }
      throw err;
    }
    await waitForPostgres(admin);
    testDbName = `zeref_worker_p4_${Date.now()}`;
    await admin.query(`CREATE DATABASE ${testDbName}`);
    await admin.end();

    const testUrl = new URL(databaseUrl);
    testUrl.pathname = `/${testDbName}`;
    pool = new pg.Pool({ connectionString: testUrl.toString() });
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder });

    const account = await pool.query(
      `INSERT INTO platform_accounts (platform, external_id, display_name)
       VALUES ('instagram', 'phase4_fixture', 'Phase 4') RETURNING id`,
    );
    platformAccountId = account.rows[0].id;

    const merged = JSON.parse(
      readFileSync(join(metricsFixtures, "ride-log.json"), "utf8"),
    ).input;

    const snap = await pool.query(
      `INSERT INTO snapshots (platform_account_id, platform, kind, source_ref, content_hash, payload_json, collected_at)
       VALUES ($1, 'instagram', 'instagram_post_raw', 'instagram:post:LOG240', 'sha256:test-phase4', $2::jsonb, NOW())
       RETURNING id`,
      [platformAccountId, JSON.stringify(merged)],
    );
    snapshotId = snap.rows[0].id;

    const builtNormalize = await import(
      pathToFileURL(join(workerRoot, "dist/jobs/normalize.js")).href
    );
    const builtAnalyze = await import(
      pathToFileURL(join(workerRoot, "dist/jobs/analyze.js")).href
    );
    const builtReport = await import(
      pathToFileURL(join(workerRoot, "dist/jobs/report.js")).href
    );
    runNormalize = builtNormalize.runNormalize;
    runAnalyze = builtAnalyze.runAnalyze;
    runReport = builtReport.runReport;
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

  it("normalize → analyze → report writes analysis_outputs and elite artifact (C23)", async () => {
    const norm = await runNormalize(
      {
        jobType: "normalize",
        snapshotId,
        schemaVersion: "4.0.0",
      },
      { pool },
    );
    normalizedEntityId = norm.normalizedEntityId;
    assert.ok(normalizedEntityId);

    const analyzeOut = await runAnalyze(
      {
        jobType: "analyze",
        schemaVersion: "4.0.0",
        normalizedEntityId,
        snapshotId,
      },
      { pool, autoReport: false },
    );
    assert.ok(analyzeOut.analysisOutputId);

    const analysisCount = await pool.query(
      `SELECT COUNT(*)::int AS c FROM analysis_outputs WHERE id = $1`,
      [analyzeOut.analysisOutputId],
    );
    assert.equal(analysisCount.rows[0].c, 1);

    const reportOut = await runReport(
      {
        jobType: "report",
        schemaVersion: "4.0.0",
        analysisOutputId: analyzeOut.analysisOutputId,
      },
      { pool },
    );
    assert.ok(reportOut.reportArtifactIds.elite);

    const eliteRows = await pool.query(
      `SELECT artifact_kind FROM report_artifacts WHERE analysis_output_id = $1`,
      [analyzeOut.analysisOutputId],
    );
    const kinds = eliteRows.rows.map((r) => r.artifact_kind);
    assert.ok(kinds.includes("elite"), "C23: elite artifact required");
  });
});
