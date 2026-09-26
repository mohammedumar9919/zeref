#!/usr/bin/env node
/**
 * CLOUD-B5 — Bulk recent Graph collect for pipeline freshness.
 *
 * Lists recent media from graph.instagram.com, skips ids already present in
 * snapshots.payload_json->graph->id, then runs collect → normalize → analyze
 * (+ embed/report auto-chain) for up to --limit newest unseen posts.
 *
 * Usage:
 *   node scripts/uat-collect-recent.mjs [--limit 5] [--handle name] [--user-id id]
 *
 * Never prints access tokens.
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import pg from "pg";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workerDist = join(repoRoot, "apps/worker/dist");
const instagramDist = join(repoRoot, "packages/instagram/dist");

function loadDotEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnvFile(join(repoRoot, ".env"));
loadDotEnvFile(join(repoRoot, "apps/web/.env.local"));

function parseArgs(argv) {
  const args = {
    limit: 5,
    handle: undefined,
    userId: process.env.INSTAGRAM_GRAPH_USER_ID,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === "--limit" && next) {
      args.limit = Math.max(1, Math.min(20, Number.parseInt(next, 10) || 5));
      i += 1;
    } else if (flag === "--handle" && next) {
      args.handle = next;
      i += 1;
    } else if (flag === "--user-id" && next) {
      args.userId = next;
      i += 1;
    } else if (flag === "--help" || flag === "-h") {
      console.log(
        "Usage: node scripts/uat-collect-recent.mjs [--limit 5] [--handle name] [--user-id id]",
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

async function alreadyCollectedGraphIds(pool) {
  const res = await pool.query(
    `SELECT DISTINCT payload_json->'graph'->>'id' AS gid
     FROM snapshots
     WHERE payload_json->'graph'->>'id' IS NOT NULL`,
  );
  return new Set(res.rows.map((r) => r.gid).filter(Boolean));
}

async function listRecentMedia(accessToken, userId, limit) {
  const url = new URL(`https://graph.instagram.com/v21.0/${userId}/media`);
  // Match packages/instagram MEDIA_FIELDS — Instagram Login has no standalone shortcode field.
  url.searchParams.set("fields", "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count");
  url.searchParams.set("limit", String(Math.min(50, Math.max(limit * 3, 10))));
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Graph /media failed: ${msg}`);
  }
  return Array.isArray(body.data) ? body.data : [];
}

async function collectOne(pool, deps, platformAccountId, mediaId) {
  const { runCollect, runNormalize, runAnalyze } = deps;
  const collectOut = await runCollect(
    {
      jobType: "collect",
      platform: "instagram",
      kind: "instagram_post_raw",
      platformAccountId,
      sources: ["graph"],
      graphMediaId: mediaId,
    },
    { pool, repoRoot, graphUserId: deps.externalId },
  );
  const normalizeOut = await runNormalize(
    {
      jobType: "normalize",
      snapshotId: collectOut.snapshotId,
      schemaVersion: "phase3-v1",
    },
    { pool, repoRoot },
  );
  const analyzeOut = await runAnalyze(
    {
      jobType: "analyze",
      schemaVersion: "4.0.0",
      normalizedEntityId: normalizeOut.normalizedEntityId,
      snapshotId: collectOut.snapshotId,
    },
    { pool, repoRoot },
  );
  return {
    mediaId,
    snapshotId: collectOut.snapshotId,
    normalizedEntityId: normalizeOut.normalizedEntityId,
    analysisOutputId: analyzeOut.analysisOutputId,
    shortcode: collectOut.shortcode,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!token) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          available: false,
          hint: "set INSTAGRAM_ACCESS_TOKEN (+ INSTAGRAM_GRAPH_USER_ID) — see docs/LIVE_INSTAGRAM_SETUP.md",
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  process.env.ZEREF_AUTO_EMBED = process.env.ZEREF_AUTO_EMBED ?? "1";
  process.env.ZEREF_AUTO_REPORT = process.env.ZEREF_AUTO_REPORT ?? "1";

  const connectionString =
    process.env.DATABASE_URL ?? "postgres://zeref:zeref@localhost:55432/zeref";
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

  const user = await fetchInstagramUser({ accessToken: token, userId: args.userId });
  const externalId = user.id;
  const displayName = args.handle ?? user.username ?? externalId;
  const platformAccountId = await ensurePlatformAccount(pool, externalId, displayName);

  const known = await alreadyCollectedGraphIds(pool);
  const media = await listRecentMedia(token, externalId, args.limit);
  const candidates = media.filter((m) => m?.id && !known.has(m.id)).slice(0, args.limit);

  const collected = [];
  const errors = [];
  for (const item of candidates) {
    try {
      const out = await collectOne(
        pool,
        { runCollect, runNormalize, runAnalyze, externalId },
        platformAccountId,
        item.id,
      );
      collected.push({
        mediaIdTail: String(item.id).slice(-6),
        mediaType: item.media_type,
        timestamp: item.timestamp,
        shortcode: out.shortcode,
        entityId: out.normalizedEntityId,
      });
    } catch (err) {
      errors.push({
        mediaIdTail: String(item.id).slice(-6),
        error: err instanceof Error ? err.message.slice(0, 160) : String(err).slice(0, 160),
      });
    }
  }

  await pool.end();

  console.log(
    JSON.stringify(
      {
        ok: errors.length === 0,
        available: true,
        account: displayName,
        graphListed: media.length,
        alreadyKnown: known.size,
        limit: args.limit,
        collected: collected.length,
        skippedAlreadyInDb: media.filter((m) => m?.id && known.has(m.id)).length,
        items: collected,
        errors,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
