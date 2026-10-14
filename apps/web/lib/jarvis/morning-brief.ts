import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { watchRuns } from "@zeref/db";
import { desc, gte, isNotNull } from "drizzle-orm";

import { getDb, isFixtureMode } from "../db";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const fixturePath = join(repoRoot, "fixtures/jarvis/morning-brief.json");

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const DEFAULT_WINDOW_MS = DAY;
const MAX_WINDOW_MS = 7 * DAY;
const WINDOW_ROW_LIMIT = 50;
const PROBLEM_RUN_LIMIT = 5;
const NEW_POST_REF_LIMIT = 5;
const PROBLEM_STATUSES = new Set(["throttled", "error"]);

/** One `watch_runs` row with timestamps as ISO strings (DB `Date`s are normalised first). */
export type WatchRunRow = {
  id: string;
  trigger: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  tokenExpiresAt: string | null;
  tokenCheckedAt: string | null;
  errorCode: string | null;
  diffJson: unknown;
};

export type MorningBriefDiffSummary = {
  collectedAt?: string;
  collectedAtLabel?: string;
  previousCollectedAt?: string;
  previousCollectedAtLabel?: string;
  newPosts: number;
  newPostRefs: string[];
  removedPosts: number;
  postsChecked: number;
  changedPosts: number;
  likesChange?: number;
  commentsChange?: number;
  reachChange?: number;
};

export type MorningBrief = {
  available: true;
  source: "live" | "fixture";
  note?: string;
  since: string;
  sinceLabel: string;
  watchEnabled: boolean;
  hasRun: boolean;
  run?: {
    id: string;
    trigger: string;
    startedAt: string;
    finishedAt: string | null;
    finishedAtLabel?: string;
  };
  diffMissing?: boolean;
  problemRunCount: number;
  problemRuns: Array<{ status: string; startedAt: string; startedAtLabel: string; errorCode: string | null }>;
  lastRun: { status: string; startedAt: string; startedAtLabel: string } | null;
  token: {
    expiresAt: string;
    expiresAtLabel: string;
    daysLeft: number;
    expired: boolean;
    checkedAt: string | null;
  } | null;
} & Partial<MorningBriefDiffSummary>;

export type MorningBriefUnavailable = { available: false; message: string };

/** "2026-10-13 06:00 UTC" — every digit also appears in the ISO value it came from. */
export function formatBriefTime(iso: string): string {
  const normal = new Date(iso).toISOString();
  return `${normal.slice(0, 10)} ${normal.slice(11, 16)} UTC`;
}

function obj(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isoOf(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return undefined;
}

function ms(iso: string | null | undefined): number {
  return iso ? Date.parse(iso) : Number.NEGATIVE_INFINITY;
}

/** Summarise a stored C18b `diff_json`; returns undefined when it is not a diff. */
export function summarizeWatchDiff(diff: unknown): MorningBriefDiffSummary | undefined {
  const root = obj(diff);
  if (!root) return undefined;
  const newPosts = Array.isArray(root.newPosts) ? root.newPosts : [];
  const removedPosts = Array.isArray(root.removedPosts) ? root.removedPosts : [];
  const posts = (Array.isArray(root.posts) ? root.posts : [])
    .map(obj)
    .filter((p): p is Record<string, unknown> => p !== undefined);

  const totals: Record<"likes" | "comments" | "reach", number | undefined> = {
    likes: undefined,
    comments: undefined,
    reach: undefined,
  };
  let changedPosts = 0;
  let latestPostCollected: string | undefined;
  for (const post of posts) {
    if (post.status === "changed") changedPosts += 1;
    const delta = obj(post.delta) ?? {};
    for (const key of ["likes", "comments", "reach"] as const) {
      const value = num(delta[key]);
      if (value !== undefined) totals[key] = (totals[key] ?? 0) + value;
    }
    const collected = isoOf(post.latestCollectedAt);
    if (collected && ms(collected) > ms(latestPostCollected)) latestPostCollected = collected;
  }

  const collectedAt = isoOf(root.mediaListCollectedAt) ?? latestPostCollected;
  const previousCollectedAt = isoOf(root.previousMediaListCollectedAt);
  const newPostRefs = newPosts
    .map((p) => {
      const ref = obj(p);
      return typeof ref?.shortcode === "string" ? ref.shortcode : typeof ref?.id === "string" ? ref.id : undefined;
    })
    .filter((r): r is string => Boolean(r))
    .slice(0, NEW_POST_REF_LIMIT);

  return {
    ...(collectedAt ? { collectedAt, collectedAtLabel: formatBriefTime(collectedAt) } : {}),
    ...(previousCollectedAt
      ? { previousCollectedAt, previousCollectedAtLabel: formatBriefTime(previousCollectedAt) }
      : {}),
    newPosts: newPosts.length,
    newPostRefs,
    removedPosts: removedPosts.length,
    postsChecked: posts.length,
    changedPosts,
    ...(totals.likes !== undefined ? { likesChange: totals.likes } : {}),
    ...(totals.comments !== undefined ? { commentsChange: totals.comments } : {}),
    ...(totals.reach !== undefined ? { reachChange: totals.reach } : {}),
  };
}

/** Resolve the window start: valid past ISO `since`, clamped to 7 days; else the last 24 h. */
export function resolveSince(since: string | undefined, now: Date): Date {
  const nowMs = now.getTime();
  const parsed = since ? Date.parse(since) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed > nowMs) return new Date(nowMs - DEFAULT_WINDOW_MS);
  return new Date(Math.max(parsed, nowMs - MAX_WINDOW_MS));
}

function latestBy(rows: WatchRunRow[], key: (row: WatchRunRow) => number): WatchRunRow | undefined {
  return rows.reduce<WatchRunRow | undefined>((best, row) => (!best || key(row) > key(best) ? row : best), undefined);
}

/** Pure brief over stored rows: latest `ok` run in the window, problem runs, token expiry, last run. */
export function buildMorningBrief(input: {
  rows: WatchRunRow[];
  now: Date;
  since: Date;
  watchEnabled: boolean;
  source: MorningBrief["source"];
  note?: string;
}): MorningBrief {
  const rows = [...new Map(input.rows.map((r) => [r.id, r])).values()];
  const sinceIso = input.since.toISOString();
  const sinceMs = input.since.getTime();
  const nowMs = input.now.getTime();
  const inWindow = rows.filter((r) => ms(r.startedAt) >= sinceMs && ms(r.startedAt) <= nowMs);

  const okRun = latestBy(
    inWindow.filter((r) => r.status === "ok"),
    (r) => Math.max(ms(r.finishedAt), ms(r.startedAt)),
  );
  const problems = inWindow
    .filter((r) => PROBLEM_STATUSES.has(r.status))
    .sort((a, b) => ms(b.startedAt) - ms(a.startedAt));
  const lastRun = latestBy(rows, (r) => ms(r.startedAt));
  const tokenRow = latestBy(
    rows.filter((r) => r.tokenExpiresAt),
    (r) => Math.max(ms(r.tokenCheckedAt), ms(r.startedAt)),
  );

  const brief: MorningBrief = {
    available: true,
    source: input.source,
    ...(input.note ? { note: input.note } : {}),
    since: sinceIso,
    sinceLabel: formatBriefTime(sinceIso),
    watchEnabled: input.watchEnabled,
    hasRun: Boolean(okRun),
    problemRunCount: problems.length,
    problemRuns: problems.slice(0, PROBLEM_RUN_LIMIT).map((r) => ({
      status: r.status,
      startedAt: r.startedAt,
      startedAtLabel: formatBriefTime(r.startedAt),
      errorCode: r.errorCode,
    })),
    lastRun: lastRun
      ? { status: lastRun.status, startedAt: lastRun.startedAt, startedAtLabel: formatBriefTime(lastRun.startedAt) }
      : null,
    token: null,
  };

  if (tokenRow?.tokenExpiresAt) {
    const remaining = ms(tokenRow.tokenExpiresAt) - nowMs;
    brief.token = {
      expiresAt: tokenRow.tokenExpiresAt,
      expiresAtLabel: formatBriefTime(tokenRow.tokenExpiresAt),
      daysLeft: Math.max(0, Math.floor(remaining / DAY)),
      expired: remaining <= 0,
      checkedAt: tokenRow.tokenCheckedAt,
    };
  }

  if (okRun) {
    brief.run = {
      id: okRun.id,
      trigger: okRun.trigger,
      startedAt: okRun.startedAt,
      finishedAt: okRun.finishedAt,
      ...(okRun.finishedAt ? { finishedAtLabel: formatBriefTime(okRun.finishedAt) } : {}),
    };
    const diff = summarizeWatchDiff(okRun.diffJson);
    if (diff) Object.assign(brief, diff);
    else brief.diffMissing = true;
  }

  return brief;
}

function toRow(raw: Record<string, unknown>): WatchRunRow | undefined {
  const startedAt = isoOf(raw.startedAt);
  if (typeof raw.id !== "string" || typeof raw.status !== "string" || !startedAt) return undefined;
  return {
    id: raw.id,
    trigger: typeof raw.trigger === "string" ? raw.trigger : "unknown",
    status: raw.status,
    startedAt,
    finishedAt: isoOf(raw.finishedAt) ?? null,
    tokenExpiresAt: isoOf(raw.tokenExpiresAt) ?? null,
    tokenCheckedAt: isoOf(raw.tokenCheckedAt) ?? null,
    errorCode: typeof raw.errorCode === "string" ? raw.errorCode : null,
    diffJson: raw.diffJson ?? null,
  };
}

function toRows(list: unknown[]): WatchRunRow[] {
  const rows: WatchRunRow[] = [];
  for (const item of list) {
    const raw = obj(item);
    const row = raw ? toRow(raw) : undefined;
    if (row) rows.push(row);
  }
  return rows;
}

const FIXTURE_NOTE = "Fixture data (ZEREF_BFF_FIXTURE=1) — not your real account.";

function loadFixtureBrief(since: string | undefined): MorningBrief {
  const raw = obj(JSON.parse(readFileSync(fixturePath, "utf8"))) ?? {};
  const now = new Date(isoOf(raw.asOf) ?? new Date().toISOString());
  return buildMorningBrief({
    rows: toRows(Array.isArray(raw.runs) ? raw.runs : []),
    now,
    since: resolveSince(since, now),
    watchEnabled: raw.watchEnabled === true,
    source: "fixture",
    note: FIXTURE_NOTE,
  });
}

async function loadLiveBrief(since: string | undefined): Promise<MorningBrief | MorningBriefUnavailable> {
  const db = getDb();
  if (!db) {
    return { available: false, message: "morning brief needs the database (watch_runs) — DATABASE_URL is not set." };
  }
  const now = new Date();
  const windowStart = resolveSince(since, now);
  const columns = {
    id: watchRuns.id,
    trigger: watchRuns.trigger,
    status: watchRuns.status,
    startedAt: watchRuns.startedAt,
    finishedAt: watchRuns.finishedAt,
    tokenExpiresAt: watchRuns.tokenExpiresAt,
    tokenCheckedAt: watchRuns.tokenCheckedAt,
    errorCode: watchRuns.errorCode,
    diffJson: watchRuns.diffJson,
  };
  const windowRows = await db
    .select(columns)
    .from(watchRuns)
    .where(gte(watchRuns.startedAt, windowStart))
    .orderBy(desc(watchRuns.startedAt))
    .limit(WINDOW_ROW_LIMIT);
  const lastRows = await db.select(columns).from(watchRuns).orderBy(desc(watchRuns.startedAt)).limit(1);
  const tokenRows = await db
    .select(columns)
    .from(watchRuns)
    .where(isNotNull(watchRuns.tokenExpiresAt))
    .orderBy(desc(watchRuns.startedAt))
    .limit(1);

  return buildMorningBrief({
    rows: toRows([...windowRows, ...lastRows, ...tokenRows]),
    now,
    since: windowStart,
    watchEnabled: process.env.ZEREF_WATCH_ENABLED?.trim() === "1",
    source: "live",
  });
}

/** `get_morning_brief` data: stored watch runs only (fixture file in fixture mode). Never calls Graph. */
export async function loadMorningBrief(
  args: { since?: string } = {},
): Promise<MorningBrief | MorningBriefUnavailable> {
  if (isFixtureMode()) return loadFixtureBrief(args.since);
  try {
    return await loadLiveBrief(args.since);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { available: false, message: `watch_runs query failed: ${message}` };
  }
}
