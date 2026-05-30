#!/usr/bin/env node
/**
 * Run full pipeline inline: collect → normalize → embed → analyze → report.
 * Uses fixture mocks (no live Instagram). Requires Postgres + migrations applied.
 *
 * Usage:
 *   npm run build
 *   docker compose up -d db
 *   node scripts/run-pipeline.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workerDist = join(repoRoot, "apps/worker/dist");
const fixturesGraph = join(repoRoot, "fixtures/phase-2/graph");
const fixturesHtml = join(repoRoot, "fixtures/phase-2/html");

const connectionString =
  process.env.DATABASE_URL ?? "postgres://zeref:zeref@localhost:5432/zeref";

function loadJson(name) {
  return JSON.parse(readFileSync(join(fixturesGraph, name), "utf8"));
}

function mockGraphFetch(routes) {
  return async (input) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\//, "");
    const key = path.split("?")[0];
    const body = routes[key];
    if (!body) {
      return new Response(`not found: ${key}`, { status: 404 });
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

async function ensurePlatformAccount(pool) {
  const existing = await pool.query(
    `SELECT id FROM platform_accounts WHERE external_id = 'pipeline_fixture' LIMIT 1`,
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }
  const inserted = await pool.query(
    `INSERT INTO platform_accounts (platform, external_id, display_name)
     VALUES ('instagram', 'pipeline_fixture', 'Pipeline Fixture') RETURNING id`,
  );
  return inserted.rows[0].id;
}

async function main() {
  process.env.ZEREF_LLM_MOCK = process.env.ZEREF_LLM_MOCK ?? "1";
  process.env.ZEREF_AUTO_EMBED = process.env.ZEREF_AUTO_EMBED ?? "1";
  process.env.ZEREF_AUTO_REPORT = process.env.ZEREF_AUTO_REPORT ?? "1";

  const pool = new pg.Pool({ connectionString, max: 5 });

  const { runCollect } = await import(pathToFileURL(join(workerDist, "jobs/collect.js")).href);
  const { runNormalize } = await import(pathToFileURL(join(workerDist, "jobs/normalize.js")).href);
  const { runAnalyze } = await import(pathToFileURL(join(workerDist, "jobs/analyze.js")).href);

  const platformAccountId = await ensurePlatformAccount(pool);

  const userFixture = loadJson("user.json");
  const mediaFixture = loadJson("media-list.json");
  const graphFetch = mockGraphFetch({
    me: userFixture,
    [`${userFixture.id}/media`]: mediaFixture,
  });
  const html = readFileSync(join(fixturesHtml, "post-hydration-ABC123xyz.html"), "utf8");

  const collectDeps = {
    pool,
    repoRoot,
    graphAccessToken: "pipeline-token",
    graphUserId: userFixture.id,
    graphBaseUrl: "https://graph.test/",
    graphFetch,
    loadScrapeHtml: async () => html,
  };

  console.log("[pipeline] collect");
  const collectOut = await runCollect(
    {
      jobType: "collect",
      platform: "instagram",
      kind: "instagram_post_raw",
      platformAccountId,
      sources: ["scrape", "graph"],
      shortcodes: ["ABC123xyz"],
    },
    collectDeps,
  );

  console.log("[pipeline] normalize (+ embed if ZEREF_AUTO_EMBED=1)");
  const normalizeOut = await runNormalize(
    {
      jobType: "normalize",
      snapshotId: collectOut.snapshotId,
      schemaVersion: "phase3-v1",
    },
    { pool, repoRoot },
  );

  console.log("[pipeline] analyze (+ report if ZEREF_AUTO_REPORT=1)");
  const analyzeOut = await runAnalyze(
    {
      jobType: "analyze",
      schemaVersion: "4.0.0",
      normalizedEntityId: normalizeOut.normalizedEntityId,
      snapshotId: collectOut.snapshotId,
    },
    { pool, repoRoot },
  );

  await pool.end();

  const summary = {
    snapshotId: collectOut.snapshotId,
    normalizedEntityId: normalizeOut.normalizedEntityId,
    analysisOutputId: analyzeOut.analysisOutputId,
    shortcode: collectOut.shortcode,
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log("[pipeline] OK");
}

main().catch((err) => {
  console.error("[pipeline] failed:", err);
  process.exit(1);
});
