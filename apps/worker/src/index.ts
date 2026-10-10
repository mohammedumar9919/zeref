export { computeContentHash } from "./lib/content-hash.js";
export { isAutoEmbedEnabled } from "./lib/auto-embed.js";
export { isAutoReportEnabled } from "./lib/auto-report.js";
export {
  embedText,
  mockEmbedVector,
  embedContentHash,
  type EmbedProviderResult,
} from "./lib/embed-provider.js";
export { embedTextFromNormalized } from "./lib/embed-text.js";
export {
  parseMergedSnapshotPayload,
  buildNormalizedPostPayload,
} from "./lib/normalize-payload.js";
export {
  collectMergedPosts,
  collectProfilePayload,
  type CollectPipelineDeps,
} from "./lib/collect-pipeline.js";
export { findExistingSnapshot, insertSnapshot } from "./lib/snapshot-store.js";
export {
  runCollect,
  collectAndPersistAll,
  createCollectHandler,
  type CollectHandlerDeps,
  type PersistedCollectOutput,
} from "./jobs/collect.js";
export {
  runScheduleCollect,
  createScheduleCollectHandler,
  buildScheduleCollectInput,
  parseCollectShortcodes,
  collectIntervalCron,
  parseCollectIntervalHours,
  resolveLatestGraphMediaId,
  applyWatchSchedule,
  type ScheduleCollectDeps,
  type ScheduleCollectResult,
  type WatchScheduleState,
} from "./jobs/schedule-collect.js";
export {
  runWatch,
  createWatchJobHandler,
  buildWatchCollectInput,
  watchErrorCode,
  WATCH_MEDIA_WINDOW,
  type WatchRunDeps,
  type WatchRunResult,
  type WatchCollected,
  type WatchLogger,
  type WatchHandlerDeps,
} from "./jobs/watch-run.js";
export {
  isWatchEnabled,
  parseGraphDailyCap,
  parseWatchTrigger,
  parseWatchCliArgs,
  utcDayStart,
  WATCH_TRIGGERS,
  DEFAULT_WATCH_INTERVAL_HOURS,
  DEFAULT_GRAPH_DAILY_CAP,
  WATCH_TOKEN_WARN_DAYS,
  type WatchTrigger,
  type WatchCliArgs,
} from "./lib/watch-config.js";
export {
  extractPostMetrics,
  diffSnapshotPair,
  diffMediaLists,
  type PostMetrics,
  type PostDiff,
  type MediaRef,
  type SnapshotLike,
  type WatchDiff,
} from "./lib/watch-diff.js";
export {
  createPgWatchStore,
  WATCH_ADVISORY_LOCK_KEY,
  type WatchStore,
  type WatchLock,
  type WatchStatus,
  type WatchRunInsert,
  type WatchRunFinish,
} from "./lib/watch-store.js";
export { runNormalize, createNormalizeHandler, type NormalizeHandlerDeps } from "./jobs/normalize.js";
export { runEmbed, createEmbedHandler, type EmbedHandlerDeps } from "./jobs/embed.js";
export { runAnalyze, createAnalyzeHandler, type AnalyzeHandlerDeps } from "./jobs/analyze.js";
export { runReport, createReportHandler, type ReportHandlerDeps } from "./jobs/report.js";
export {
  COLLECT_JOB_NAME,
  NORMALIZE_JOB_NAME,
  EMBED_JOB_NAME,
  ANALYZE_JOB_NAME,
  REPORT_JOB_NAME,
  RESEARCH_JOB_NAME,
  SCHEDULE_COLLECT_JOB_NAME,
  PIPELINE_STAGE_JOB_NAMES,
  WORKER_JOB_NAMES,
  type WorkerJobName,
} from "./jobs/registry.js";
export { createWorkerBoss, registerWorkers, registerCollectWorker, startWorker, type WorkerBossOptions } from "./boss.js";
