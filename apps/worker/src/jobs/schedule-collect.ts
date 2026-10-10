import { CollectJobInputSchema } from "@zeref/contracts";
import { graphGet, type GraphFetch } from "@zeref/instagram";
import type PgBoss from "pg-boss";
import { COLLECT_JOB_NAME, SCHEDULE_COLLECT_JOB_NAME } from "./registry.js";
import {
  collectIntervalCron,
  isWatchEnabled,
  parseCollectIntervalHours,
} from "../lib/watch-config.js";

export { collectIntervalCron, parseCollectIntervalHours } from "../lib/watch-config.js";

export type ScheduleCollectResult =
  | { skipped: true; reason: "missing_token" }
  | { skipped: false; jobId: string | null };

export type ScheduleCollectDeps = {
  boss: PgBoss;
  accessToken?: string;
  shortcodesEnv?: string;
  graphMediaIdEnv?: string;
  send?: (name: string, data: unknown) => Promise<string | null>;
  /** Newest own media id when no env target is set (default: Graph `/me/media?limit=1`). */
  resolveLatestMediaId?: (accessToken: string) => Promise<string>;
};

/** Parse comma-separated shortcodes from operator env (C166). */
export function parseCollectShortcodes(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

/** Build raw collect input for scheduled Graph post collect (C165). */
export function buildScheduleCollectInput(env: {
  shortcodes?: string;
  graphMediaId?: string;
}): unknown {
  const shortcodes = parseCollectShortcodes(env.shortcodes);
  const graphMediaId = env.graphMediaId?.trim() || undefined;

  return {
    jobType: "collect" as const,
    platform: "instagram" as const,
    kind: "instagram_post_raw" as const,
    sources: ["graph" as const],
    ...(shortcodes.length > 0 ? { shortcodes } : {}),
    ...(graphMediaId ? { graphMediaId } : {}),
  };
}

/** Newest own Graph media id (same lookup as the web enqueue path, reimplemented here). */
export async function resolveLatestGraphMediaId(opts: {
  accessToken: string;
  userId?: string;
  fetchImpl?: GraphFetch;
  baseUrl?: string;
}): Promise<string> {
  const res = await graphGet<{ data?: Array<{ id: string }> }>(
    `${opts.userId?.trim() || "me"}/media?fields=id,timestamp&limit=1`,
    opts.accessToken,
    opts.fetchImpl ?? globalThis.fetch,
    opts.baseUrl ?? "https://graph.instagram.com",
  );
  const id = res.data?.[0]?.id;
  if (!id) throw new Error("Graph /media returned no posts to collect");
  return id;
}

/**
 * Scheduled collect: enqueue `collect` when INSTAGRAM_ACCESS_TOKEN is set (C165).
 * No-ops with log when token missing — not fatal (ADR-042). Without an env target the
 * newest own media id is resolved first (C18b).
 */
export async function runScheduleCollect(
  deps: ScheduleCollectDeps,
): Promise<ScheduleCollectResult> {
  const token = deps.accessToken ?? process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token?.trim()) {
    console.log("[schedule-collect] INSTAGRAM_ACCESS_TOKEN missing — skipping");
    return { skipped: true, reason: "missing_token" };
  }

  const shortcodes = deps.shortcodesEnv ?? process.env.ZEREF_COLLECT_SHORTCODES;
  let graphMediaId = deps.graphMediaIdEnv ?? process.env.ZEREF_COLLECT_GRAPH_MEDIA_ID;
  if (parseCollectShortcodes(shortcodes).length === 0 && !graphMediaId?.trim()) {
    const resolve =
      deps.resolveLatestMediaId ??
      ((accessToken: string) =>
        resolveLatestGraphMediaId({
          accessToken,
          userId: process.env.INSTAGRAM_GRAPH_USER_ID,
        }));
    graphMediaId = await resolve(token.trim());
  }

  const input = CollectJobInputSchema.parse(
    buildScheduleCollectInput({ shortcodes, graphMediaId }),
  );
  const send =
    deps.send ??
    ((name: string, data: unknown) => deps.boss.send(name, data as object));
  const jobId = await send(COLLECT_JOB_NAME, input);

  return { skipped: false, jobId };
}

export function createScheduleCollectHandler(deps: { boss: PgBoss }) {
  return async (_job: { data: unknown }): Promise<ScheduleCollectResult> =>
    runScheduleCollect({ boss: deps.boss });
}

export type WatchScheduleState =
  | { scheduled: true; cron: string; intervalHours: number }
  | { scheduled: false };

/**
 * Opt-in recurring watch: schedule `schedule-collect` only when `ZEREF_WATCH_ENABLED=1`,
 * otherwise remove any schedule left over from earlier runs.
 */
export async function applyWatchSchedule(
  boss: Pick<PgBoss, "schedule" | "unschedule">,
  env: Record<string, string | undefined> = process.env,
): Promise<WatchScheduleState> {
  if (!isWatchEnabled(env)) {
    await boss.unschedule(SCHEDULE_COLLECT_JOB_NAME);
    return { scheduled: false };
  }
  const intervalHours = parseCollectIntervalHours(env.ZEREF_COLLECT_INTERVAL_HOURS);
  const cron = collectIntervalCron(intervalHours);
  await boss.schedule(SCHEDULE_COLLECT_JOB_NAME, cron, { trigger: "schedule" });
  return { scheduled: true, cron, intervalHours };
}
