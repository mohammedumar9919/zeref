export const PHASE0_CONTRACT_VERSION = "0.1.0";
export const PHASE1_CONTRACT_VERSION = "1.0.0";
export const PHASE2_CONTRACT_VERSION = "2.0.0";
export const PHASE3_CONTRACT_VERSION = "3.0.0";
export const PHASE4_CONTRACT_VERSION = "4.0.0";
export const PHASE5_CONTRACT_VERSION = "5.0.0";
export const PHASE5_1_CONTRACT_VERSION = "5.1.0";
export const PHASE6_CONTRACT_VERSION = "6.0.0";
export const PHASE7_CONTRACT_VERSION = "7.0.0";
export const PHASE8_CONTRACT_VERSION = "8.0.0";

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
  CockpitSlicesSchema,
  CockpitStudioItemSchema,
  CockpitCalendarItemSchema,
  CockpitReportItemSchema,
  CockpitResearchItemSchema,
  CockpitStudioPanelSchema,
  CockpitCalendarPanelSchema,
  CockpitReportsPanelSchema,
  CockpitResearchPanelSchema,
  TelemetryEventSchema,
  type CockpitSlices,
  type CockpitStudioItem,
  type CockpitCalendarItem,
  type CockpitReportItem,
  type CockpitResearchItem,
  type TelemetryEvent,
} from "./phase5/index.js";

export {
  JarvisToolNameSchema,
  JarvisToolCallSchema,
  JarvisGlobeStateSchema,
  JarvisTurnInputSchema,
  JarvisTurnAckOutputSchema,
  JarvisTurnResultOutputSchema,
  JarvisTurnOutputSchema,
  VoiceTranscriptRoleSchema,
  VoiceAudioPhaseSchema,
  VoiceStateEventSchema,
  VoiceTranscriptEventSchema,
  VoiceAudioEventSchema,
  PipelineEventSchema,
  type JarvisToolName,
  type JarvisToolCall,
  type JarvisGlobeState,
  type JarvisTurnInput,
  type JarvisTurnAckOutput,
  type JarvisTurnResultOutput,
  type JarvisTurnOutput,
  type VoiceTranscriptRole,
  type VoiceAudioPhase,
  type VoiceStateEvent,
  type VoiceTranscriptEvent,
  type VoiceAudioEvent,
  type PipelineEvent,
} from "./phase6/index.js";

export {
  MemoryTierSchema,
  MemoryObservationSchema,
  MemorySourceSchema,
  MemoryEntrySchema,
  MemorySearchResultItemSchema,
  MemorySearchResultSchema,
  MemoryEntitySchema,
  MemoryRelationSchema,
  MemorySavedEventSchema,
  MemorySearchEventSchema,
  MemoryContradictionEventSchema,
  MemoryEntityChangedEventSchema,
  MemoryBrainEventSchema,
  CockpitSseOutboxSchema,
  type MemoryTier,
  type MemoryObservation,
  type MemorySource,
  type MemoryEntry,
  type MemorySearchResultItem,
  type MemorySearchResult,
  type MemoryEntity,
  type MemoryRelation,
  type MemorySavedEvent,
  type MemorySearchEvent,
  type MemoryContradictionEvent,
  type MemoryEntityChangedEvent,
  type MemoryBrainEvent,
  type CockpitSseOutbox,
} from "./phase7/index.js";

export {
  CalendarEventStatusSchema,
  CalendarEventSchema,
  StudioDraftSchema,
  UiJobTypeSchema,
  JobEnqueueRequestSchema,
  CockpitSlicesSchemaV8,
  CockpitStudioItemSchemaV8,
  CockpitCalendarItemSchemaV8,
  CockpitReportItemSchemaV8,
  CockpitResearchItemSchemaV8,
  CockpitStudioPanelSchemaV8,
  CockpitCalendarPanelSchemaV8,
  CockpitReportsPanelSchemaV8,
  CockpitResearchPanelSchemaV8,
  type CalendarEventStatus,
  type CalendarEvent,
  type StudioDraft,
  type UiJobType,
  type JobEnqueueRequest,
  type CockpitSlicesV8,
  type CockpitStudioItemV8,
  type CockpitCalendarItemV8,
  type CockpitReportItemV8,
  type CockpitResearchItemV8,
} from "./phase8/index.js";

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
