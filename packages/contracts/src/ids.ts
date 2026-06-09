import { z } from "zod";

/** Branded UUID IDs (ADR-002). Serialized as plain UUID strings in JSON. */
export const PlatformAccountIdSchema = z.string().uuid().brand<"PlatformAccountId">();
export type PlatformAccountId = z.infer<typeof PlatformAccountIdSchema>;

export const SnapshotIdSchema = z.string().uuid().brand<"SnapshotId">();
export type SnapshotId = z.infer<typeof SnapshotIdSchema>;

export const NormalizedEntityIdSchema = z.string().uuid().brand<"NormalizedEntityId">();
export type NormalizedEntityId = z.infer<typeof NormalizedEntityIdSchema>;

export const AnalysisOutputIdSchema = z.string().uuid().brand<"AnalysisOutputId">();
export type AnalysisOutputId = z.infer<typeof AnalysisOutputIdSchema>;

export const ReportArtifactIdSchema = z.string().uuid().brand<"ReportArtifactId">();
export type ReportArtifactId = z.infer<typeof ReportArtifactIdSchema>;

export const MetricFactIdSchema = z.string().uuid().brand<"MetricFactId">();
export type MetricFactId = z.infer<typeof MetricFactIdSchema>;

export const EmbeddingVectorIdSchema = z.string().uuid().brand<"EmbeddingVectorId">();
export type EmbeddingVectorId = z.infer<typeof EmbeddingVectorIdSchema>;

export const ResearchTopicIdSchema = z.string().uuid().brand<"ResearchTopicId">();
export type ResearchTopicId = z.infer<typeof ResearchTopicIdSchema>;

export const ResearchSignalIdSchema = z.string().uuid().brand<"ResearchSignalId">();
export type ResearchSignalId = z.infer<typeof ResearchSignalIdSchema>;
