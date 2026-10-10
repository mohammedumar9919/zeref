#!/usr/bin/env node
/**
 * Trigger one own-account watch run (C18b).
 *
 *   node apps/worker/dist/cli/watch-trigger.js [--trigger task_scheduler|on_demand|schedule] [--direct]
 *
 * Default: enqueue a `schedule-collect` job for the running worker. `--direct` runs the
 * watch in this process (no worker needed). Requires DATABASE_URL. Never prints secrets.
 */
import PgBoss from "pg-boss";
import pg from "pg";
import { SCHEDULE_COLLECT_JOB_NAME } from "../jobs/registry.js";
import { createWatchJobHandler } from "../jobs/watch-run.js";
import { parseWatchCliArgs } from "../lib/watch-config.js";

const USAGE =
  "Usage: node apps/worker/dist/cli/watch-trigger.js [--trigger task_scheduler|on_demand|schedule] [--direct]";

async function main(): Promise<number> {
  let args;
  try {
    args = parseWatchCliArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`[watch-trigger] ${err instanceof Error ? err.message : "bad arguments"}\n${USAGE}`);
    return 2;
  }
  if (args.help) {
    console.log(USAGE);
    return 0;
  }
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error("[watch-trigger] DATABASE_URL is not set");
    return 1;
  }

  if (args.direct) {
    const pool = new pg.Pool({ connectionString, max: 4 });
    try {
      const result = await createWatchJobHandler({ pool, repoRoot: process.cwd() })({
        data: { trigger: args.trigger },
      });
      const { diff: _diff, ...summary } = result as { diff?: unknown };
      console.log(JSON.stringify(summary));
      return result.status === "error" ? 1 : 0;
    } finally {
      await pool.end();
    }
  }

  const boss = new PgBoss(connectionString);
  await boss.start();
  try {
    await boss.createQueue(SCHEDULE_COLLECT_JOB_NAME);
    const jobId = await boss.send(
      SCHEDULE_COLLECT_JOB_NAME,
      { trigger: args.trigger },
      { retryLimit: 0 },
    );
    console.log(
      JSON.stringify({ queue: SCHEDULE_COLLECT_JOB_NAME, trigger: args.trigger, jobId }),
    );
    return 0;
  } finally {
    await boss.stop({ graceful: true, timeout: 5000 });
  }
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(`[watch-trigger] failed: ${err instanceof Error ? err.name : "error"}`);
    process.exit(1);
  },
);
