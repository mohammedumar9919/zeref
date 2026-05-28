export const PHASE0_CONTRACT_VERSION = "0.1.0";
export const PHASE1_CONTRACT_VERSION = "1.0.0";

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
  type PlatformAccountId,
  type SnapshotId,
  type NormalizedEntityId,
  type AnalysisOutputId,
  type ReportArtifactId,
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
  NormalizeJobInputSchema,
  AnalyzeJobInputSchema,
  ReportJobInputSchema,
  type CollectJobInput,
  type NormalizeJobInput,
  type AnalyzeJobInput,
  type ReportJobInput,
} from "./jobs/index.js";
