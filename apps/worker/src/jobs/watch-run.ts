import { CollectJobInputSchema, type CollectJobInput } from "@zeref/contracts";
import {
  debugTokenExpiry,
  graphGet,
  GraphThrottledError,
  redactGraphSecrets,
  shortcodeFromPermalink,
  type GraphBudget,
  type GraphFetch,
  type GraphGetOptions,
} from "@zeref/instagram";
import type { Pool } from "pg";
import { collectAndPersistAll } from "./collect.js";
import { buildScheduleCollectInput, parseCollectShortcodes } from "./schedule-collect.js";
import {
  isWatchEnabled,
  parseGraphDailyCap,
  parseWatchTrigger,
  utcDayStart,
  WATCH_TOKEN_WARN_DAYS,
  type WatchTrigger,
} from "../lib/watch-config.js";
import {
  diffMediaLists,
  diffSnapshotPair,
  type MediaRef,
  type PostDiff,
  type WatchDiff,
} from "../lib/watch-diff.js";
import {
  createPgWatchStore,
  type WatchStatus,
  type WatchStore,
} from "../lib/watch-store.js";

const DEFAULT_GRAPH_BASE = "https://graph.instagram.com";
export const WATCH_MEDIA_WINDOW = 12;

export type WatchCollected = { sourceRef: string; snapshotId: string };

export type WatchLogger = {
  info(message: string): void;
  warn(message: string): void;
};

export type WatchRunDeps = {
  store: WatchStore;
  trigger: WatchTrigger;
  /** Persists snapshots for `input`; Graph calls must go through `graph`. */
  collect: (input: CollectJobInput, graph: GraphGetOptions) => Promise<WatchCollected[]>;
  env?: Record<string, string | undefined>;
  now?: () => Date;
  graphFetch?: GraphFetch;
  graphBaseUrl?: string;
  debugTokenBaseUrl?: string;
  throttleAtPct?: number;
  log?: WatchLogger;
};

export type WatchRunResult = {
  runId: string | null;
  trigger: WatchTrigger;
  status: Exclude<WatchStatus, "running">;
  graphCalls: number;
  maxUsagePct: number | null;
  tokenExpiresAt: string | null;
  errorCode: string | null;
  diff: WatchDiff | null;
};

const defaultLog: WatchLogger = {
  info: (m) => console.log(`[watch] ${m}`),
  warn: (m) => console.warn(`[watch] ${m}`),
};

/** Stable, secret-free error code for `watch_runs.error_code`. */
export function watchErrorCode(err: unknown): string {
  if (err instanceof GraphThrottledError) return `throttled_${err.reason}`;
  if (err && typeof err === "object" && (err as { name?: unknown }).name === "ZodError") {
    return "invalid_collect_input";
  }
  const message = err instanceof Error ? err.message : "";
  const http = message.match(/^Graph API (\d{3})\b/);
  if (http) return `graph_http_${http[1]}`;
  if (message.startsWith("Graph API request failed")) return "graph_network";
  if (message.startsWith("collect produced no merged posts")) return "collect_no_posts";
  return "internal";
}

type MediaListResponse = {
  data?: Array<{ id: string; timestamp?: string; permalink?: string }>;
};

async function fetchRecentMedia(opts: {
  token: string;
  userId?: string;
  fetchImpl: GraphFetch;
  baseUrl: string;
  graph: GraphGetOptions;
}): Promise<MediaRef[]> {
  const res = await graphGet<MediaListResponse>(
    `${opts.userId || "me"}/media?fields=id,timestamp,permalink&limit=${WATCH_MEDIA_WINDOW}`,
    opts.token,
    opts.fetchImpl,
    opts.baseUrl,
    opts.graph,
  );
  return (res.data ?? []).map((m) => {
    const shortcode = shortcodeFromPermalink(m.permalink);
    return {
      id: m.id,
      ...(m.timestamp ? { timestamp: m.timestamp } : {}),
      ...(shortcode ? { shortcode } : {}),
    };
  });
}

/** Env targets win; otherwise the newest own media id from the recent-media window. */
export function buildWatchCollectInput(
  env: Record<string, string | undefined>,
  newestMediaId: string | undefined,
): unknown {
  const envMediaId = env.ZEREF_COLLECT_GRAPH_MEDIA_ID?.trim();
  const hasShortcodes = parseCollectShortcodes(env.ZEREF_COLLECT_SHORTCODES).length > 0;
  return buildScheduleCollectInput({
    shortcodes: env.ZEREF_COLLECT_SHORTCODES,
    graphMediaId: envMediaId || (hasShortcodes ? undefined : newestMediaId),
  });
}

/**
 * One own-account watch run (C18b): opt-in check → advisory lock → daily Graph budget →
 * token expiry (≤ 1×/day) → recent media → collect → diff → `watch_runs` audit row.
 * Never throws for Graph/collect failures; the run row records the outcome instead.
 */
export async function runWatch(deps: WatchRunDeps): Promise<WatchRunResult> {
  const env = deps.env ?? process.env;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? defaultLog;
  const { store, trigger } = deps;
  const startedAt = now();

  const skip = async (
    status: "skipped_disabled" | "skipped_no_token" | "skipped_locked",
  ): Promise<WatchRunResult> => {
    const runId = await store.insertRun({ trigger, startedAt, status, finishedAt: now() });
    log.info(`${trigger} run ${status}`);
    return {
      runId,
      trigger,
      status,
      graphCalls: 0,
      maxUsagePct: null,
      tokenExpiresAt: null,
      errorCode: null,
      diff: null,
    };
  };

  if (trigger !== "on_demand" && !isWatchEnabled(env)) return skip("skipped_disabled");

  const token = env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!token) return skip("skipped_no_token");
  const appToken = env.INSTAGRAM_APP_TOKEN?.trim() || undefined;
  const secrets = [token, appToken];

  const lock = await store.tryAcquireLock();
  if (!lock) return skip("skipped_locked");

  let runId: string | null = null;
  let runCalls = 0;
  let maxUsagePct: number | null = null;
  let tokenExpiresAt: Date | null = null;
  let tokenCheckedAt: Date | null = null;
  let diff: WatchDiff | null = null;
  let status: WatchRunResult["status"] = "ok";
  let errorCode: string | null = null;

  try {
    runId = await store.insertRun({ trigger, startedAt, status: "running" });

    const dayStart = utcDayStart(startedAt);
    const usedToday = await store.graphCallsSince(dayStart);
    const cap = parseGraphDailyCap(env.ZEREF_GRAPH_DAILY_CAP);
    const budget: GraphBudget = {
      tryConsume(n = 1) {
        const amount = Math.max(0, Math.floor(n));
        if (usedToday + runCalls + amount > cap) return false;
        runCalls += amount;
        return true;
      },
      used: () => usedToday + runCalls,
      cap: () => cap,
    };
    const graph: GraphGetOptions = {
      budget,
      onUsage: (u) => {
        maxUsagePct = Math.max(maxUsagePct ?? 0, u.maxPct);
      },
      ...(deps.throttleAtPct !== undefined ? { throttleAtPct: deps.throttleAtPct } : {}),
    };
    const fetchImpl = deps.graphFetch ?? globalThis.fetch;

    if (appToken && !(await store.tokenCheckedSince(dayStart))) {
      if (!budget.tryConsume()) throw new GraphThrottledError("daily_cap");
      tokenCheckedAt = now();
      try {
        const res = await debugTokenExpiry({
          appToken,
          inputToken: token,
          fetchImpl,
          ...(deps.debugTokenBaseUrl ? { baseUrl: deps.debugTokenBaseUrl } : {}),
        });
        tokenExpiresAt = res.expiresAt;
        if (!res.isValid) log.warn("Instagram access token reported invalid by debug_token");
        if (res.expiresAt) {
          const daysLeft = (res.expiresAt.getTime() - tokenCheckedAt.getTime()) / 86_400_000;
          if (daysLeft < WATCH_TOKEN_WARN_DAYS) {
            log.warn(
              `Instagram access token expires in ${Math.max(0, daysLeft).toFixed(1)} days (${res.expiresAt.toISOString()}) — refresh it`,
            );
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.warn(`token expiry check failed: ${redactGraphSecrets(msg, secrets)}`);
      }
    }

    const mediaListCollectedAt = now();
    const media = await fetchRecentMedia({
      token,
      userId: env.INSTAGRAM_GRAPH_USER_ID?.trim(),
      fetchImpl,
      baseUrl: deps.graphBaseUrl ?? DEFAULT_GRAPH_BASE,
      graph,
    });
    const previousList = await store.lastMediaList();
    const { newPosts, removedPosts } = diffMediaLists(media, previousList?.media ?? null, {
      windowFull: media.length >= WATCH_MEDIA_WINDOW,
    });

    const raw = buildWatchCollectInput(env, media[0]?.id);
    const target = raw as { shortcodes?: string[]; graphMediaId?: string };
    if (!target.shortcodes?.length && !target.graphMediaId) {
      errorCode = "no_media";
      status = "error";
    } else {
      const input = CollectJobInputSchema.parse(raw);
      const collected = await deps.collect(input, graph);

      const posts: PostDiff[] = [];
      for (const c of collected) {
        const [latest, previous] = await store.latestSnapshots(c.sourceRef, 2);
        if (!latest) continue;
        const newThisRun =
          latest.id === c.snapshotId && latest.collectedAt.getTime() >= startedAt.getTime();
        posts.push(diffSnapshotPair(latest, previous, { newThisRun }));
      }

      diff = {
        mediaListCollectedAt: mediaListCollectedAt.toISOString(),
        previousMediaListCollectedAt: previousList?.collectedAt || null,
        media,
        newPosts,
        removedPosts,
        posts,
      };
    }
  } catch (err) {
    if (err instanceof GraphThrottledError) {
      status = "throttled";
      log.warn(
        `Graph throttled (${err.reason})${err.retryAfterMin !== undefined ? `, retry after ~${err.retryAfterMin} min` : ""}; waiting for next schedule`,
      );
    } else {
      status = "error";
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`run failed: ${redactGraphSecrets(msg, secrets).slice(0, 300)}`);
    }
    errorCode = watchErrorCode(err);
  } finally {
    try {
      if (runId) {
        await store.finishRun(runId, {
          status,
          finishedAt: now(),
          graphCalls: runCalls,
          maxUsagePct,
          tokenExpiresAt,
          tokenCheckedAt,
          errorCode,
          diffJson: diff,
        });
      }
    } finally {
      await lock.release();
    }
  }

  log.info(`${trigger} run ${status} (graph calls ${runCalls})`);
  return {
    runId,
    trigger,
    status,
    graphCalls: runCalls,
    maxUsagePct,
    tokenExpiresAt: (tokenExpiresAt as Date | null)?.toISOString() ?? null,
    errorCode,
    diff,
  };
}

export type WatchHandlerDeps = {
  pool: Pool;
  repoRoot?: string;
};

/** pg-boss handler for `schedule-collect`: never throws, so pg-boss never retries a run. */
export function createWatchJobHandler(deps: WatchHandlerDeps) {
  const store = createPgWatchStore(deps.pool);
  return async (job: { data: unknown }): Promise<WatchRunResult | { status: "error"; errorCode: string }> => {
    try {
      return await runWatch({
        store,
        trigger: parseWatchTrigger(job.data),
        collect: async (input, graph) => {
          const { outputs } = await collectAndPersistAll(input, {
            pool: deps.pool,
            repoRoot: deps.repoRoot,
            graphOptions: graph,
          });
          return outputs.map((o) => ({ sourceRef: o.sourceRef, snapshotId: o.snapshotId }));
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const secrets = [process.env.INSTAGRAM_ACCESS_TOKEN, process.env.INSTAGRAM_APP_TOKEN];
      console.warn(`[watch] run aborted: ${redactGraphSecrets(msg, secrets).slice(0, 300)}`);
      return { status: "error", errorCode: watchErrorCode(err) };
    }
  };
}
