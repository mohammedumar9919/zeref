import { CollectJobInputSchema } from "@zeref/contracts";
import type PgBoss from "pg-boss";
import { COLLECT_JOB_NAME } from "./registry.js";

export type ScheduleCollectResult =
  | { skipped: true; reason: "missing_token" }
  | { skipped: false; jobId: string | null };

export type ScheduleCollectDeps = {
  boss: PgBoss;
  accessToken?: string;
  shortcodesEnv?: string;
  graphMediaIdEnv?: string;
  send?: (name: string, data: unknown) => Promise<string | null>;
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

/** Cron expression for recurring schedule-collect (default every 6h). */
export function collectIntervalCron(hours: number): string {
  const interval = Number.isFinite(hours) && hours > 0 ? Math.floor(hours) : 6;
  return `0 */${interval} * * *`;
}

export function parseCollectIntervalHours(raw: string | undefined): number {
  if (!raw?.trim()) return 6;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 6;
}

/**
 * Scheduled collect: enqueue `collect` when INSTAGRAM_ACCESS_TOKEN is set (C165).
 * No-ops with log when token missing — not fatal (ADR-042).
 */
export async function runScheduleCollect(
  deps: ScheduleCollectDeps,
): Promise<ScheduleCollectResult> {
  const token = deps.accessToken ?? process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token?.trim()) {
    console.log("[schedule-collect] INSTAGRAM_ACCESS_TOKEN missing — skipping");
    return { skipped: true, reason: "missing_token" };
  }

  const raw = buildScheduleCollectInput({
    shortcodes: deps.shortcodesEnv ?? process.env.ZEREF_COLLECT_SHORTCODES,
    graphMediaId: deps.graphMediaIdEnv ?? process.env.ZEREF_COLLECT_GRAPH_MEDIA_ID,
  });

  const input = CollectJobInputSchema.parse(raw);
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
