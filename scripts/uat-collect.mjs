#!/usr/bin/env node
/**
 * P12.1 — Live Instagram collect UAT (Graph-only, real token).
 *
 * Runs the real pipeline inline against graph.instagram.com (Instagram API with
 * Instagram Login — no Facebook Page required):
 *   collect (graph) -> normalize (+embed) -> analyze (+report)
 *
 * Unlike scripts/run-pipeline.mjs (fixture-locked mock fetch), this uses the
 * LIVE Graph client. Requires a real INSTAGRAM_ACCESS_TOKEN + Postgres.
 *
 * Graph collect for instagram_post_raw requires shortcodes and/or a media id
 * (see CollectJobInputSchema superRefine) — blind "fetch all" is not allowed.
 *
 * Usage:
 *   docker compose up -d db
 *   $env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
 *   $env:INSTAGRAM_ACCESS_TOKEN='<long-lived token>'
 *   npm run build
 *   node scripts/uat-collect.mjs --media-id <graph-media-id>
 *   # or
 *   node scripts/uat-collect.mjs --shortcodes ABC123,DEF456
 *
 * Optional:
 *   --handle <name>     display name for the platform account row
 *   --user-id <id>      IG user id (else resolved via /me, or INSTAGRAM_GRAPH_USER_ID)
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workerDist = join(repoRoot, "apps/worker/dist");
const instagramDist = join(repoRoot, "packages/instagram/dist");

function parseArgs(argv) {
  const args = {
    mediaId: undefined,
    shortcodes: undefined,
    handle: undefined,
    userId: process.env.INSTAGRAM_GRAPH_USER_ID,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === "--media-id" && next) {
      args.mediaId = next;
      i += 1;
    } else if (flag === "--shortcodes" && next) {
      args.shortcodes = next.split(",").map((s) => s.trim()).filter(Boolean);
      i += 1;
    } else if (flag === "--handle" && next) {
      args.handle = next;
      i += 1;
    } else if (flag === "--user-id" && next) {
      args.userId = next;
      i += 1;
    } else if (flag === "--help" || flag === "-h") {
      console.log(
        "Usage: node scripts/uat-collect.mjs (--media-id <id> | --shortcodes a,b) [--handle name] [--user-id id]",
      );
      process.exit(0);
    }
  }
  return args;
}

async function ensurePlatformAccount(pool, externalId, displayName) {
  const existing = await pool.query(
    `SELECT id FROM platform_accounts WHERE platform = 'instagram' AND external_id = $1 LIMIT 1`,
    [externalId],
  );
  if (existing.rowCount > 0) return existing.rows[0].id;
  const inserted = await pool.query(
    `INSERT INTO platform_accounts (platform, external_id, display_name)
     VALUES ('instagram', $1, $2) RETURNING id`,
    [externalId, displayName],
  );
  return inserted.rows[0].id;
}

async function main() {
  const args = parseArgs(process.argv);
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    throw new Error("INSTAGRAM_ACCESS_TOKEN required for live UAT collect");
  }
  if (!args.mediaId && !args.shortcodes?.length) {
    throw new Error(
      "graph collect requires --media-id <id> and/or --shortcodes a,b (CollectJobInputSchema)",
    );
  }

  // Live by default — these enable the auto-chain and never mock the graph fetch.
  process.env.ZEREF_AUTO_EMBED = process.env.ZEREF_AUTO_EMBED ?? "1";
  process.env.ZEREF_AUTO_REPORT = process.env.ZEREF_AUTO_REPORT ?? "1";

  const connectionString =
    process.env.DATABASE_URL ?? "postgres://zeref:zeref@localhost:5432/zeref";
  const pool = new pg.Pool({ connectionString, max: 5 });

  const { fetchInstagramUser } = await import(
    pathToFileURL(join(instagramDist, "index.js")).href
  );
  const { runCollect } = await import(
    pathToFileURL(join(workerDist, "jobs/collect.js")).href
  );
  const { runNormalize } = await import(
    pathToFileURL(join(workerDist, "jobs/normalize.js")).href
  );
  const { runAnalyze } = await import(
    pathToFileURL(join(workerDist, "jobs/analyze.js")).href
  );

  // Resolve the real IG user so the snapshot links to a real account row.
  const user = await fetchInstagramUser({ accessToken: token, userId: args.userId });
  const externalId = user.id;
  const displayName = args.handle ?? user.username ?? externalId;
  console.log(`[uat-collect] account: ${displayName} (${externalId})`);

  const platformAccountId = await ensurePlatformAccount(pool, externalId, displayName);

  console.log("[uat-collect] collect (graph, live)");
  const collectOut = await runCollect(
    {
      jobType: "collect",
      platform: "instagram",
      kind: "instagram_post_raw",
      platformAccountId,
      sources: ["graph"],
      ...(args.shortcodes?.length ? { shortcodes: args.shortcodes } : {}),
      ...(args.mediaId ? { graphMediaId: args.mediaId } : {}),
    },
    { pool, repoRoot, graphUserId: externalId },
  );

  console.log("[uat-collect] normalize (+ embed if ZEREF_AUTO_EMBED=1)");
  const normalizeOut = await runNormalize(
    {
      jobType: "normalize",
      snapshotId: collectOut.snapshotId,
      schemaVersion: "phase3-v1",
    },
    { pool, repoRoot },
  );

  console.log("[uat-collect] analyze (+ report if ZEREF_AUTO_REPORT=1)");
  const analyzeOut = await runAnalyze(
    {
      jobType: "analyze",
      schemaVersion: "4.0.0",
      normalizedEntityId: normalizeOut.normalizedEntityId,
      snapshotId: collectOut.snapshotId,
    },
    { pool, repoRoot },
  );

  // Surface media URLs to prove C164 (media preserved) on real data.
  const normalized = await pool.query(
    `SELECT payload_json FROM normalized_entities WHERE id = $1`,
    [normalizeOut.normalizedEntityId],
  );
  const payload = normalized.rows[0]?.payload_json ?? {};

  await pool.end();

  console.log(
    JSON.stringify(
      {
        account: { externalId, displayName },
        snapshotId: collectOut.snapshotId,
        normalizedEntityId: normalizeOut.normalizedEntityId,
        analysisOutputId: analyzeOut.analysisOutputId,
        shortcode: collectOut.shortcode,
        media: {
          mediaType: payload.mediaType,
          thumbnailUrl: payload.thumbnailUrl,
          videoUrl: payload.videoUrl,
          carouselUrls: payload.carouselUrls,
        },
      },
      null,
      2,
    ),
  );
  console.log("[uat-collect] OK — view at /cockpit (expect data-age=live)");
}

main().catch((err) => {
  console.error("[uat-collect] failed:", err);
  process.exit(1);
});
