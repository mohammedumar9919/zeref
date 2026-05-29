import PgBoss from "pg-boss";
import type { Pool } from "pg";
import { createAnalyzeHandler } from "./jobs/analyze.js";
import { createCollectHandler } from "./jobs/collect.js";
import { createEmbedHandler } from "./jobs/embed.js";
import { createNormalizeHandler } from "./jobs/normalize.js";
import { createReportHandler } from "./jobs/report.js";
import {
  ANALYZE_JOB_NAME,
  COLLECT_JOB_NAME,
  EMBED_JOB_NAME,
  NORMALIZE_JOB_NAME,
  REPORT_JOB_NAME,
} from "./jobs/registry.js";

export type WorkerBossOptions = {
  connectionString: string;
  pool: Pool;
  repoRoot?: string;
};

export async function createWorkerBoss(options: WorkerBossOptions): Promise<PgBoss> {
  const boss = new PgBoss(options.connectionString);
  await boss.start();
  return boss;
}

async function registerJobHandler(
  boss: PgBoss,
  name: string,
  handler: (job: { data: unknown }) => Promise<unknown>,
): Promise<void> {
  await boss.work(name, async (jobs) => {
    const results: unknown[] = [];
    for (const job of jobs) {
      results.push(await handler(job));
    }
    return results;
  });
}

/** Register collect, normalize, embed, analyze, and report handlers (C18). */
export async function registerWorkers(
  boss: PgBoss,
  options: WorkerBossOptions,
): Promise<void> {
  const shared = { pool: options.pool, repoRoot: options.repoRoot };

  await registerJobHandler(boss, COLLECT_JOB_NAME, createCollectHandler(shared));
  await registerJobHandler(boss, NORMALIZE_JOB_NAME, createNormalizeHandler(shared));
  await registerJobHandler(boss, EMBED_JOB_NAME, createEmbedHandler(shared));
  await registerJobHandler(boss, ANALYZE_JOB_NAME, createAnalyzeHandler(shared));
  await registerJobHandler(boss, REPORT_JOB_NAME, createReportHandler(shared));
}

/** @deprecated Use registerWorkers */
export async function registerCollectWorker(
  boss: PgBoss,
  options: WorkerBossOptions,
): Promise<void> {
  await registerWorkers(boss, options);
}

export async function startWorker(options: WorkerBossOptions): Promise<PgBoss> {
  const boss = await createWorkerBoss(options);
  await registerWorkers(boss, options);
  return boss;
}
