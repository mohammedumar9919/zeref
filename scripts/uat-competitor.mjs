#!/usr/bin/env node
/**
 * CLOUD-B4 — Laptop-safe Facebook Business Discovery UAT.
 *
 * Uses the B3 client (graph.facebook.com). Never prints FACEBOOK_ACCESS_TOKEN.
 * Missing FACEBOOK_* → soft-fail hint (exit 0). Live Graph needs human tokens.
 *
 *   node scripts/uat-competitor.mjs --username nasa
 *   .\scripts\live-competitor-check.ps1 -Username nasa
 *
 * Optional: --media-limit 6  --top 5
 * See docs/LIVE_COMPETITOR_SETUP.md
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const FACEBOOK_HINT = "set FACEBOOK_* — see docs/LIVE_COMPETITOR_SETUP.md";
const DEFAULT_TOP_N = 5;
const DEFAULT_MEDIA_LIMIT = 6;

export function parseCompetitorUatArgs(argv) {
  const args = {
    username: undefined,
    mediaLimit: DEFAULT_MEDIA_LIMIT,
    topN: DEFAULT_TOP_N,
    help: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === "--username" && next) {
      args.username = next.replace(/^@+/, "").trim();
      i += 1;
    } else if (flag === "--media-limit" && next) {
      const n = Number.parseInt(next, 10);
      if (Number.isFinite(n)) args.mediaLimit = n;
      i += 1;
    } else if ((flag === "--top" || flag === "--top-n") && next) {
      const n = Number.parseInt(next, 10);
      if (Number.isFinite(n)) args.topN = n;
      i += 1;
    } else if (flag === "--help" || flag === "-h") {
      args.help = true;
    }
  }
  return args;
}

export function summarizeCompetitorDiscovery(result, options = {}) {
  const topN = Math.max(1, Math.min(12, options.topN ?? DEFAULT_TOP_N));
  const media = Array.isArray(result?.media) ? [...result.media] : [];
  media.sort((a, b) => (Number(b?.like_count) || 0) - (Number(a?.like_count) || 0));
  return {
    username: result?.username,
    name: result?.name,
    followersCount: result?.followersCount,
    mediaCount: result?.mediaCount,
    sourceHost: result?.sourceHost ?? "graph.facebook.com",
    topLikes: media.slice(0, topN).map((item) => ({
      id: item?.id,
      likes: Number(item?.like_count) || 0,
      comments: Number(item?.comments_count) || 0,
      mediaType: item?.media_type,
    })),
  };
}

function readFacebookEnv(env) {
  const token = String(env?.FACEBOOK_ACCESS_TOKEN ?? "").trim();
  const igBusinessId = String(env?.FACEBOOK_IG_BUSINESS_ID ?? "").trim();
  return {
    token: token || undefined,
    igBusinessId: igBusinessId || undefined,
  };
}

function redactUatText(text, token) {
  let out = String(text ?? "").replace(/access_token=[^&\s"'\\]+/gi, "access_token=REDACTED");
  const secret = token?.trim();
  if (secret) {
    out = out.split(secret).join("[redacted]");
  }
  return out.slice(0, 300);
}

function usage() {
  return [
    "Usage: node scripts/uat-competitor.mjs --username <public_biz> [--media-limit 6] [--top 5]",
    "Requires FACEBOOK_ACCESS_TOKEN + FACEBOOK_IG_BUSINESS_ID (never printed).",
    FACEBOOK_HINT,
  ].join("\n");
}

async function loadFetchCompetitorDiscovery() {
  const dist = join(repoRoot, "packages/instagram/dist/index.js");
  try {
    const mod = await import(pathToFileURL(dist).href);
    return mod.fetchCompetitorDiscovery;
  } catch {
    const src = join(repoRoot, "packages/instagram/src/graph/business-discovery.ts");
    const mod = await import(pathToFileURL(src).href);
    return mod.fetchCompetitorDiscovery;
  }
}

/**
 * @param {{
 *   argv?: string[],
 *   env?: NodeJS.ProcessEnv,
 *   log?: (line: string) => void,
 *   discover?: (opts: object) => Promise<object>,
 *   fetchImpl?: typeof fetch,
 * }} options
 */
export async function runCompetitorUat(options = {}) {
  const argv = options.argv ?? process.argv;
  const env = options.env ?? process.env;
  const log = options.log ?? console.log;
  const args = parseCompetitorUatArgs(argv);

  if (args.help) {
    log(usage());
    return { exitCode: 0, ok: true, help: true };
  }

  if (!args.username) {
    log(usage());
    return { exitCode: 1, ok: false, error: "Missing --username" };
  }

  const { token, igBusinessId } = readFacebookEnv(env);
  if (!token || !igBusinessId) {
    const payload = {
      ok: false,
      available: false,
      hint: FACEBOOK_HINT,
      message:
        "FACEBOOK_ACCESS_TOKEN and FACEBOOK_IG_BUSINESS_ID are required for live Business Discovery UAT (laptop). CI stays fixture-safe.",
    };
    log(JSON.stringify(payload, null, 2));
    return { exitCode: 0, ...payload };
  }

  if (String(env.ZEREF_BFF_FIXTURE ?? "") === "1") {
    const payload = {
      ok: false,
      available: false,
      hint: FACEBOOK_HINT,
      message: "ZEREF_BFF_FIXTURE=1 — skipped live graph.facebook.com UAT",
    };
    log(JSON.stringify(payload, null, 2));
    return { exitCode: 0, ...payload };
  }

  try {
    const discover = options.discover ?? (await loadFetchCompetitorDiscovery());
    const result = await discover({
      accessToken: token,
      igBusinessId,
      username: args.username,
      mediaLimit: args.mediaLimit,
      fetchImpl: options.fetchImpl,
    });
    const summary = summarizeCompetitorDiscovery(result, { topN: args.topN });
    const payload = { ok: true, available: true, summary };
    log(JSON.stringify(payload, null, 2));
    return { exitCode: 0, ok: true, available: true, summary };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const error = redactUatText(raw, token);
    const payload = {
      ok: false,
      available: false,
      hint: FACEBOOK_HINT,
      error,
    };
    log(JSON.stringify(payload, null, 2));
    return { exitCode: 1, ...payload };
  }
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  runCompetitorUat()
    .then((result) => {
      process.exit(result.exitCode);
    })
    .catch((err) => {
      const token = process.env.FACEBOOK_ACCESS_TOKEN;
      console.error("[uat-competitor] failed:", redactUatText(err instanceof Error ? err.message : String(err), token));
      process.exit(1);
    });
}
