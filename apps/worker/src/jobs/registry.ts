/** Phase 2 worker job registry (C9) — collect only. */
export const COLLECT_JOB_NAME = "collect" as const;

export const WORKER_JOB_NAMES = [COLLECT_JOB_NAME] as const;

export type WorkerJobName = (typeof WORKER_JOB_NAMES)[number];
