export const PHASE0_CONTRACT_VERSION = "0.1.0";
export const PHASE1_CONTRACT_VERSION = "1.0.0";
export const PHASE2_CONTRACT_VERSION = "2.0.0";
export const PHASE3_CONTRACT_VERSION = "3.0.0";
export const PHASE4_CONTRACT_VERSION = "4.0.0";

export {
  PlatformSchema,
  SnapshotKindSchema,
  PipelineStageSchema,
  JobTypeSchema,
  type Platform,
  type SnapshotKind,
  type PipelineStage,
  type JobType,
} from "./enums.js";

export {
  PlatformAccountIdSchema,
  SnapshotIdSchema,
  NormalizedEntityIdSchema,
  AnalysisOutputIdSchema,
  ReportArtifactIdSchema,
  MetricFactIdSchema,
  EmbeddingVectorIdSchema,
  type PlatformAccountId,
  type SnapshotId,
  type NormalizedEntityId,
  type AnalysisOutputId,
  type ReportArtifactId,
  type MetricFactId,
  type EmbeddingVectorId,
} from "./ids.js";

export {
  InsufficientDataSchema,
  type InsufficientData,
} from "./insufficient-data.js";

export {
  RAW_BLOB_FIELD_KEYS,
  assertNoRawBlobFields,
  withRawBlobGuard,
  type RawBlobFieldKey,
} from "./raw-blob-guard.js";

export {
  CollectJobInputSchema,
  CollectJobOutputSchema,
  NormalizeJobInputSchema,
  NormalizeJobOutputSchema,
  EmbedJobInputSchema,
  EmbedJobOutputSchema,
  AnalyzeJobInputSchema,
  AnalyzeJobOutputSchema,
  ReportJobInputSchema,
  ReportJobOutputSchema,
  type CollectJobInput,
  type CollectJobOutput,
  type NormalizeJobInput,
  type NormalizeJobOutput,
  type EmbedJobInput,
  type EmbedJobOutput,
  type AnalyzeJobInput,
  type AnalyzeJobOutput,
  type ReportJobInput,
  type ReportJobOutput,
} from "./jobs/index.js";

export {
  EliteReportSchema,
  EliteCitationSchema,
  EliteCitationIndexEntrySchema,
  EliteRecommendationSchema,
  type EliteReport,
} from "./phase4/index.js";

export {
  NormalizedPostPayloadSchema,
  MetricFactsFactsJsonSchema,
  MetricFactsPayloadSchema,
  type NormalizedPostPayload,
  type MetricFactsFactsJson,
  type MetricFactsPayload,
} from "./phase3/index.js";

export {
  CollectSourceSchema,
  GraphIgUserSchema,
  GraphMediaFieldsSchema,
  GraphMediaListResponseSchema,
  ScrapePostFieldsSchema,
  MergedInstagramPostPayloadSchema,
  type CollectSource,
  type GraphIgUser,
  type GraphMediaFields,
  type GraphMediaListResponse,
  type ScrapePostFields,
  type MergedInstagramPostPayload,
} from "./instagram/index.js";
