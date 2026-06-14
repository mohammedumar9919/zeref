import { WorkerHealthResponseSchema, type WorkerHealthResponse } from "@zeref/contracts";
import type pg from "pg";

import { isWorkerAvailable } from "../cockpit/simulated-pipeline";
import { getDatabaseUrl, getPool, isFixtureMode } from "../db";

const PGBOSS_SCHEMA = "pgboss";
const RECENT_JOB_WINDOW_MINUTES = 10;
const SUPERVISOR_HEARTBEAT_MINUTES = 3;

/** Sync fast path — fixture mode and env-only fallback without DB (C124). */
export function resolveWorkerHealth(): WorkerHealthResponse {
  if (isFixtureMode()) {
    return { consuming: false, source: "fixture" };
  }

  if (!getPool()) {
    return { consuming: false, source: "env" };
  }

  return { consuming: false, source: "probe" };
}

async function checkPgBossConsuming(pool: pg.Pool): Promise<boolean> {
  const schemaCheck = await pool.query<{ ok: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
    ) AS ok`,
    [PGBOSS_SCHEMA],
  );
  if (!schemaCheck.rows[0]?.ok) {
    return false;
  }

  const { rows } = await pool.query<{
    maintained_on: Date | null;
    monitored_on: Date | null;
    has_active_jobs: boolean;
    has_recent_completed: boolean;
  }>(
    `SELECT
      (SELECT maintained_on FROM pgboss.version LIMIT 1) AS maintained_on,
      (SELECT monitored_on FROM pgboss.version LIMIT 1) AS monitored_on,
      EXISTS (
        SELECT 1 FROM pgboss.job
        WHERE state IN ('active', 'retry')
          AND started_on > now() - interval '${RECENT_JOB_WINDOW_MINUTES} minutes'
      ) AS has_active_jobs,
      EXISTS (
        SELECT 1 FROM pgboss.job
        WHERE state = 'completed'
          AND completed_on > now() - interval '${RECENT_JOB_WINDOW_MINUTES} minutes'
      ) AS has_recent_completed`,
  );

  const row = rows[0];
  if (!row) {
    return false;
  }

  if (row.has_active_jobs || row.has_recent_completed) {
    return true;
  }

  const heartbeatMs = SUPERVISOR_HEARTBEAT_MINUTES * 60 * 1000;
  const now = Date.now();
  const maintainedRecent =
    row.maintained_on instanceof Date && now - row.maintained_on.getTime() <= heartbeatMs;
  const monitoredRecent =
    row.monitored_on instanceof Date && now - row.monitored_on.getTime() <= heartbeatMs;

  return maintainedRecent || monitoredRecent;
}

/** Real pg-boss probe when DATABASE_URL is configured (ADR-038 / C131). */
export async function probeWorkerHealth(): Promise<WorkerHealthResponse> {
  if (isFixtureMode()) {
    return { consuming: false, source: "fixture" };
  }

  const pool = getPool();
  if (!pool) {
    return { consuming: false, source: "env" };
  }

  if (!getDatabaseUrl()) {
    return { consuming: false, source: "env" };
  }

  try {
    const consuming = await checkPgBossConsuming(pool);
    if (consuming) {
      return { consuming: true, source: "pg-boss-probe" };
    }

    if (isWorkerAvailable()) {
      return { consuming: false, source: "probe" };
    }

    return { consuming: false, source: "probe" };
  } catch {
    return { consuming: false, source: "probe" };
  }
}

export async function getWorkerHealthResponse(): Promise<WorkerHealthResponse> {
  const health = await probeWorkerHealth();
  return WorkerHealthResponseSchema.parse(health);
}
