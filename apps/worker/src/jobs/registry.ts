/** Phase 3 worker job registry (C12) — collect, normalize, embed only. */
export const COLLECT_JOB_NAME = "collect" as const;
export const NORMALIZE_JOB_NAME = "normalize" as const;
export const EMBED_JOB_NAME = "embed" as const;

export const WORKER_JOB_NAMES = [
  COLLECT_JOB_NAME,
  NORMALIZE_JOB_NAME,
  EMBED_JOB_NAME,
] as const;

export type WorkerJobName = (typeof WORKER_JOB_NAMES)[number];
