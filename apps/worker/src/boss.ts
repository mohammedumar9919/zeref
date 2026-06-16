import PgBoss from "pg-boss";
import type { Pool } from "pg";
import { createAnalyzeHandler } from "./jobs/analyze.js";
import { createCollectHandler } from "./jobs/collect.js";
import { createEmbedHandler } from "./jobs/embed.js";
import { createNormalizeHandler } from "./jobs/normalize.js";
import { createReportHandler } from "./jobs/report.js";
import { createResearchHandler } from "./jobs/research.js";
import { createScheduleCollectHandler } from "./jobs/schedule-collect.js";
import {
  ANALYZE_JOB_NAME,
  COLLECT_JOB_NAME,
  EMBED_JOB_NAME,
  NORMALIZE_JOB_NAME,
  REPORT_JOB_NAME,
  RESEARCH_JOB_NAME,
  SCHEDULE_COLLECT_JOB_NAME,
  type WorkerJobName,
} from "./jobs/registry.js";
import {
  collectIntervalCron,
  parseCollectIntervalHours,
} from "./jobs/schedule-collect.js";
import { insertCockpitPipelineOutbox } from "./lib/cockpit-outbox.js";

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
  name: WorkerJobName,
  handler: (job: { data: unknown }) => Promise<unknown>,
  pool: Pool,
): Promise<void> {
  await boss.work(name, async (jobs) => {
    const results: unknown[] = [];
    for (const job of jobs) {
      const result = await handler(job);
      await insertCockpitPipelineOutbox(pool, name);
      results.push(result);
    }
    return results;
  });
}

/** Register collect, normalize, embed, analyze, report, and research handlers (C18, C83). */
export async function registerWorkers(
  boss: PgBoss,
  options: WorkerBossOptions,
): Promise<void> {
  const shared = { pool: options.pool, repoRoot: options.repoRoot };

  await registerJobHandler(
    boss,
    COLLECT_JOB_NAME,
    createCollectHandler(shared),
    options.pool,
  );
  await registerJobHandler(
    boss,
    NORMALIZE_JOB_NAME,
    createNormalizeHandler(shared),
    options.pool,
  );
  await registerJobHandler(
    boss,
    EMBED_JOB_NAME,
    createEmbedHandler(shared),
    options.pool,
  );
  await registerJobHandler(
    boss,
    ANALYZE_JOB_NAME,
    createAnalyzeHandler(shared),
    options.pool,
  );
  await registerJobHandler(
    boss,
    REPORT_JOB_NAME,
    createReportHandler(shared),
    options.pool,
  );
  await registerJobHandler(
    boss,
    RESEARCH_JOB_NAME,
    createResearchHandler(shared),
    options.pool,
  );

  const scheduleHandler = createScheduleCollectHandler({ boss });
  await boss.work(SCHEDULE_COLLECT_JOB_NAME, async (jobs) => {
    const results = [];
    for (const job of jobs) {
      results.push(await scheduleHandler(job));
    }
    return results;
  });
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

  const intervalHours = parseCollectIntervalHours(process.env.ZEREF_COLLECT_INTERVAL_HOURS);
  await boss.schedule(
    SCHEDULE_COLLECT_JOB_NAME,
    collectIntervalCron(intervalHours),
    {},
  );

  return boss;
}
