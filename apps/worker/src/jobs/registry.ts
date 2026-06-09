/** Phase 4 worker job registry (C18) + Phase 9 research (C83). */
export const COLLECT_JOB_NAME = "collect" as const;
export const NORMALIZE_JOB_NAME = "normalize" as const;
export const EMBED_JOB_NAME = "embed" as const;
export const ANALYZE_JOB_NAME = "analyze" as const;
export const REPORT_JOB_NAME = "report" as const;
export const RESEARCH_JOB_NAME = "research" as const;

export const WORKER_JOB_NAMES = [
  COLLECT_JOB_NAME,
  NORMALIZE_JOB_NAME,
  EMBED_JOB_NAME,
  ANALYZE_JOB_NAME,
  REPORT_JOB_NAME,
  RESEARCH_JOB_NAME,
] as const;

export type WorkerJobName = (typeof WORKER_JOB_NAMES)[number];
