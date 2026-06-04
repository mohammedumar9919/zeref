import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");
const repoRoot = join(webRoot, "../..");
const dbPkgRoot = join(repoRoot, "packages/db");
const migrationsFolder = join(dbPkgRoot, "drizzle");
const fixturesRoot = join(repoRoot, "fixtures/phase-5");
const eliteGoldenPath = join(
  repoRoot,
  "fixtures/phase-4/elite/ride-log-elite.golden.json",
);

const bff = await import(pathToFileURL(join(webRoot, "lib/cockpit-bff.ts")).href);
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href,
);

const FIXTURE_ARTIFACT_ID = "550e8400-e29b-41d4-a716-446655440000";
const defaultUrl = "postgres://zeref:zeref@localhost:35432/zeref";

function resolveDatabaseUrl() {
  return process.env.DATABASE_URL ?? defaultUrl;
}

describe("cockpit BFF (fixture mode)", () => {
  before(() => {
    process.env.ZEREF_BFF_FIXTURE = "1";
    delete process.env.DATABASE_URL;
  });

  after(() => {
    delete process.env.ZEREF_BFF_FIXTURE;
  });

  it("loadCockpitSlices returns CockpitSlicesSchemaV8-valid fixture", async () => {
    const slices = await bff.loadCockpitSlices();
    const parsed = contracts.CockpitSlicesSchemaV8.parse(slices);
    assert.equal(parsed.schemaVersion, "phase8-cockpit-v1");
    assert.equal(parsed.panels.reports.items[0]?.artifactId, FIXTURE_ARTIFACT_ID);
    assert.equal(parsed.panels.research.insufficientData, true);
  });

  it("getReportArtifact returns EliteReportSchema for fixture artifact id", async () => {
    const result = await bff.getReportArtifact(FIXTURE_ARTIFACT_ID);
    assert.equal(result.status, 200);
    contracts.EliteReportSchema.parse(result.body);
    assert.match(result.body.headline.text, /Ride log post/);
  });

  it("getReportArtifact returns 404 for unknown id", async () => {
    const result = await bff.getReportArtifact("00000000-0000-4000-8000-000000009999");
    assert.equal(result.status, 404);
  });
});

describe(
  "cockpit BFF (database)",
  { skip: process.env.SKIP_DB_TESTS === "1" || process.env.ZEREF_BFF_FIXTURE === "1" },
  () => {
  /** @type {pg.Pool} */
  let pool;
  let testDbName;
  let databaseUrl;
  let artifactId;
  let dbUnavailable = false;

  before(async () => {
    delete process.env.ZEREF_BFF_FIXTURE;
    databaseUrl = resolveDatabaseUrl();
    const admin = new pg.Client({ connectionString: databaseUrl });
    try {
      await admin.connect();
    } catch (err) {
      if (err?.code === "ECONNREFUSED" || err?.name === "AggregateError") {
        dbUnavailable = true;
        return;
      }
      throw err;
    }
    testDbName = `zeref_web_bff_${Date.now()}`;
    await admin.query(`CREATE DATABASE ${testDbName}`);
    await admin.end();

    const testUrl = new URL(databaseUrl);
    testUrl.pathname = `/${testDbName}`;
    pool = new pg.Pool({ connectionString: testUrl.toString() });
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder });

    const elite = JSON.parse(readFileSync(eliteGoldenPath, "utf8"));
    const account = await pool.query(
      `INSERT INTO platform_accounts (platform, external_id, display_name)
       VALUES ('instagram', 'bff_fixture', 'BFF Fixture') RETURNING id`,
    );
    const platformAccountId = account.rows[0].id;

    const snap = await pool.query(
      `INSERT INTO snapshots (platform_account_id, platform, kind, source_ref, content_hash, payload_json, collected_at)
       VALUES ($1, 'instagram', 'instagram_post_raw', 'instagram:post:LOG240', 'sha256:bff-fixture', '{}'::jsonb, NOW())
       RETURNING id`,
      [platformAccountId],
    );
    const snapshotId = snap.rows[0].id;

    const entity = await pool.query(
      `INSERT INTO normalized_entities (snapshot_id, schema_version, payload_json)
       VALUES ($1, '4.0.0', $2::jsonb)
       RETURNING id`,
      [
        snapshotId,
        JSON.stringify({
          shortcode: "LOG240",
          caption: "Ride log fixture caption",
          sources: ["graph"],
          schemaVersion: "4.0.0",
        }),
      ],
    );
    const normalizedEntityId = entity.rows[0].id;

    const analysis = await pool.query(
      `INSERT INTO analysis_outputs (normalized_entity_id, snapshot_id, schema_version, payload_json)
       VALUES ($1, $2, '4.0.0', '{}'::jsonb)
       RETURNING id`,
      [normalizedEntityId, snapshotId],
    );
    const analysisOutputId = analysis.rows[0].id;

    const artifact = await pool.query(
      `INSERT INTO report_artifacts (
         analysis_output_id, normalized_entity_id, snapshot_id,
         schema_version, artifact_kind, payload_json
       )
       VALUES ($1, $2, $3, '4.0.0', 'elite', $4::jsonb)
       RETURNING id`,
      [analysisOutputId, normalizedEntityId, snapshotId, JSON.stringify(elite)],
    );
    artifactId = artifact.rows[0].id;
    process.env.DATABASE_URL = testUrl.toString();
    bff.resetDbPoolForTests();
  });

  after(async () => {
    delete process.env.DATABASE_URL;
    bff.resetDbPoolForTests();
    if (pool) {
      const admin = new pg.Client({ connectionString: databaseUrl });
      await admin.connect();
      await pool.end();
      await admin.query(`DROP DATABASE IF EXISTS ${testDbName}`);
      await admin.end();
    }
  });

  it("loadCockpitSlices reads studio and reports from Postgres", { skip: () => dbUnavailable }, async () => {
    const slices = await bff.loadCockpitSlices();
    contracts.CockpitSlicesSchemaV8.parse(slices);
    assert.ok(slices.panels.studio.items.length >= 1);
    assert.ok(slices.panels.reports.items.some((item) => item.artifactId === artifactId));
  });

  it("getReportArtifact validates elite payload_json from Postgres", { skip: () => dbUnavailable }, async () => {
    const result = await bff.getReportArtifact(artifactId);
    assert.equal(result.status, 200);
    contracts.EliteReportSchema.parse(result.body);
  });
});
