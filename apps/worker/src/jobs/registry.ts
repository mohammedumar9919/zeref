/** Phase 4 worker job registry (C18) + Phase 9 research (C83) + Phase 12 schedule (C165). */
export const COLLECT_JOB_NAME = "collect" as const;
export const NORMALIZE_JOB_NAME = "normalize" as const;
export const EMBED_JOB_NAME = "embed" as const;
export const ANALYZE_JOB_NAME = "analyze" as const;
export const REPORT_JOB_NAME = "report" as const;
export const RESEARCH_JOB_NAME = "research" as const;
export const SCHEDULE_COLLECT_JOB_NAME = "schedule-collect" as const;

/** Pipeline stages that emit cockpit SSE outbox events. */
export const PIPELINE_STAGE_JOB_NAMES = [
  COLLECT_JOB_NAME,
  NORMALIZE_JOB_NAME,
  EMBED_JOB_NAME,
  ANALYZE_JOB_NAME,
  REPORT_JOB_NAME,
  RESEARCH_JOB_NAME,
] as const;

export const WORKER_JOB_NAMES = [
  ...PIPELINE_STAGE_JOB_NAMES,
  SCHEDULE_COLLECT_JOB_NAME,
] as const;

export type WorkerJobName = (typeof PIPELINE_STAGE_JOB_NAMES)[number];
