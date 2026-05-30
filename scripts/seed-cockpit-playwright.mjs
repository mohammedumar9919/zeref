#!/usr/bin/env node
/**
 * Seed minimal pipeline rows for Playwright / BFF integration (ADR-016).
 *
 * Usage:
 *   DATABASE_URL=postgres://zeref:zeref@localhost:35432/zeref node scripts/seed-cockpit-playwright.mjs
 *
 * Prints the elite report_artifacts.id for ?artifact= deep links.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const eliteGoldenPath = join(repoRoot, "fixtures/phase-4/elite/ride-log-elite.golden.json");

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://zeref:zeref@localhost:35432/zeref";

const elite = JSON.parse(readFileSync(eliteGoldenPath, "utf8"));

const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  const account = await pool.query(
    `INSERT INTO platform_accounts (platform, external_id, display_name)
     VALUES ('instagram', 'playwright_seed', 'Playwright Seed')
     ON CONFLICT (platform, external_id) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id`,
  );

  const platformAccountId = account.rows[0].id;

  const snap = await pool.query(
    `INSERT INTO snapshots (platform_account_id, platform, kind, source_ref, content_hash, payload_json, collected_at)
     VALUES ($1, 'instagram', 'instagram_post_raw', 'instagram:post:PW240', 'sha256:playwright-seed', '{}'::jsonb, NOW())
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
        shortcode: "PW240",
        caption: "Playwright seed ride log",
        sources: [{ kind: "graph" }],
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

  const artifactId = artifact.rows[0].id;
  console.log(`Seeded elite report_artifacts.id=${artifactId}`);
  console.log(`Deep link: /cockpit/reports?artifact=${artifactId}`);
  console.log(`BFF detail: GET /api/v1/reports/artifacts/${artifactId}`);
} finally {
  await pool.end();
}
