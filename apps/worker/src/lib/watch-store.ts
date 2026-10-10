import type { Pool } from "pg";
import type { WatchTrigger } from "./watch-config.js";
import type { MediaRef, SnapshotLike } from "./watch-diff.js";

export type WatchStatus =
  | "running"
  | "ok"
  | "throttled"
  | "skipped_locked"
  | "skipped_disabled"
  | "skipped_no_token"
  | "error";

export type WatchRunInsert = {
  trigger: WatchTrigger;
  startedAt: Date;
  status: WatchStatus;
  finishedAt?: Date | null;
  errorCode?: string | null;
};

export type WatchRunFinish = {
  status: Exclude<WatchStatus, "running">;
  finishedAt: Date;
  graphCalls: number;
  maxUsagePct: number | null;
  tokenExpiresAt: Date | null;
  tokenCheckedAt: Date | null;
  errorCode: string | null;
  diffJson: unknown | null;
};

export interface WatchLock {
  release(): Promise<void>;
}

/** Persistence used by a watch run; the Postgres impl is `createPgWatchStore`. */
export interface WatchStore {
  /** Non-blocking single-run lock; `null` when another run holds it. */
  tryAcquireLock(): Promise<WatchLock | null>;
  insertRun(row: WatchRunInsert): Promise<string>;
  finishRun(id: string, patch: WatchRunFinish): Promise<void>;
  /** Sum of `graph_calls` for runs started at or after `since`. */
  graphCallsSince(since: Date): Promise<number>;
  tokenCheckedSince(since: Date): Promise<boolean>;
  /** Recent-media window stored by the last `ok` run, if any. */
  lastMediaList(): Promise<{ media: MediaRef[]; collectedAt: string } | null>;
  latestSnapshots(sourceRef: string, limit: number): Promise<SnapshotLike[]>;
}

/** Arbitrary constant key shared by every watch run (pg advisory locks are per-database). */
export const WATCH_ADVISORY_LOCK_KEY = "1812180002";

export function createPgWatchStore(pool: Pool): WatchStore {
  return {
    async tryAcquireLock() {
      const client = await pool.connect();
      try {
        const res = await client.query<{ ok: boolean }>(
          "SELECT pg_try_advisory_lock($1::bigint) AS ok",
          [WATCH_ADVISORY_LOCK_KEY],
        );
        if (!res.rows[0]?.ok) {
          client.release();
          return null;
        }
      } catch (err) {
        client.release();
        throw err;
      }
      return {
        async release() {
          try {
            await client.query("SELECT pg_advisory_unlock($1::bigint)", [
              WATCH_ADVISORY_LOCK_KEY,
            ]);
            client.release();
          } catch (err) {
            client.release(err instanceof Error ? err : true);
          }
        },
      };
    },

    async insertRun(row) {
      const res = await pool.query<{ id: string }>(
        `INSERT INTO watch_runs (trigger, started_at, finished_at, status, error_code)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [row.trigger, row.startedAt, row.finishedAt ?? null, row.status, row.errorCode ?? null],
      );
      const id = res.rows[0]?.id;
      if (!id) throw new Error("watch_runs INSERT returned no row");
      return id;
    },

    async finishRun(id, patch) {
      await pool.query(
        `UPDATE watch_runs SET
           status = $2, finished_at = $3, graph_calls = $4, max_usage_pct = $5,
           token_expires_at = $6, token_checked_at = $7, error_code = $8, diff_json = $9::jsonb
         WHERE id = $1`,
        [
          id,
          patch.status,
          patch.finishedAt,
          patch.graphCalls,
          patch.maxUsagePct,
          patch.tokenExpiresAt,
          patch.tokenCheckedAt,
          patch.errorCode,
          patch.diffJson == null ? null : JSON.stringify(patch.diffJson),
        ],
      );
    },

    async graphCallsSince(since) {
      const res = await pool.query<{ total: string | null }>(
        "SELECT COALESCE(SUM(graph_calls), 0)::text AS total FROM watch_runs WHERE started_at >= $1",
        [since],
      );
      return Number(res.rows[0]?.total ?? 0);
    },

    async tokenCheckedSince(since) {
      const res = await pool.query(
        "SELECT 1 FROM watch_runs WHERE token_checked_at >= $1 LIMIT 1",
        [since],
      );
      return (res.rowCount ?? 0) > 0;
    },

    async lastMediaList() {
      const res = await pool.query<{ diff_json: unknown }>(
        `SELECT diff_json FROM watch_runs
         WHERE status = 'ok' AND diff_json ? 'media'
         ORDER BY started_at DESC LIMIT 1`,
      );
      const diff = res.rows[0]?.diff_json as
        | { media?: unknown; mediaListCollectedAt?: unknown }
        | undefined;
      if (!diff || !Array.isArray(diff.media)) return null;
      return {
        media: diff.media as MediaRef[],
        collectedAt: typeof diff.mediaListCollectedAt === "string" ? diff.mediaListCollectedAt : "",
      };
    },

    async latestSnapshots(sourceRef, limit) {
      const res = await pool.query<{
        id: string;
        source_ref: string;
        collected_at: Date;
        payload_json: unknown;
      }>(
        `SELECT id, source_ref, collected_at, payload_json FROM snapshots
         WHERE source_ref = $1 ORDER BY collected_at DESC, created_at DESC LIMIT $2`,
        [sourceRef, limit],
      );
      return res.rows.map((r) => ({
        id: r.id,
        sourceRef: r.source_ref,
        collectedAt: new Date(r.collected_at),
        payloadJson: r.payload_json,
      }));
    },
  };
}
