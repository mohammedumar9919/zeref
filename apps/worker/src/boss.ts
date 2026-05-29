import PgBoss from "pg-boss";
import type { Pool } from "pg";
import { createCollectHandler } from "./jobs/collect.js";
import { COLLECT_JOB_NAME } from "./jobs/registry.js";

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

/** Register only the collect job handler (C9). */
export async function registerCollectWorker(
  boss: PgBoss,
  options: WorkerBossOptions,
): Promise<void> {
  const handler = createCollectHandler({
    pool: options.pool,
    repoRoot: options.repoRoot,
  });
  await boss.work(COLLECT_JOB_NAME, async (jobs) => {
    const results: unknown[] = [];
    for (const job of jobs) {
      results.push(await handler(job));
    }
    return results;
  });
}

export async function startWorker(options: WorkerBossOptions): Promise<PgBoss> {
  const boss = await createWorkerBoss(options);
  await registerCollectWorker(boss, options);
  return boss;
}
