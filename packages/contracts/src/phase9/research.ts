import { z } from "zod";
import {
  EmbeddingVectorIdSchema,
  MetricFactIdSchema,
  NormalizedEntityIdSchema,
  ResearchSignalIdSchema,
  ResearchTopicIdSchema,
  SnapshotIdSchema,
} from "../ids.js";

export const ResearchSignalTypeSchema = z.enum([
  "engagement_delta",
  "embedding_cluster",
]);
export type ResearchSignalType = z.infer<typeof ResearchSignalTypeSchema>;

/** Research topic summary DTO (ADR-031). */
export const ResearchTopicSchema = z
  .object({
    id: ResearchTopicIdSchema,
    title: z.string().min(1),
    scopeEntityId: NormalizedEntityIdSchema.optional(),
    trendScore: z.number().optional(),
    signalCount: z.number().int().nonnegative(),
    lastComputedAt: z.string().datetime({ offset: true }).optional(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type ResearchTopic = z.infer<typeof ResearchTopicSchema>;

/** Persisted research signal (ADR-031). */
export const ResearchSignalSchema = z
  .object({
    id: ResearchSignalIdSchema,
    topicId: ResearchTopicIdSchema,
    sourceEntityId: NormalizedEntityIdSchema.optional(),
    sourceSnapshotId: SnapshotIdSchema.optional(),
    signalType: ResearchSignalTypeSchema,
    score: z.number(),
    payloadJson: z.record(z.unknown()).default({}),
    computedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type ResearchSignal = z.infer<typeof ResearchSignalSchema>;

/** Topic detail with signals for BFF (C84). */
export const ResearchTopicDetailSchema = z
  .object({
    topic: ResearchTopicSchema,
    signals: z.array(ResearchSignalSchema),
  })
  .strict();
export type ResearchTopicDetail = z.infer<typeof ResearchTopicDetailSchema>;

/** In-memory metric fact row for worker signal planning. */
export const ResearchMetricFactRowSchema = z
  .object({
    id: MetricFactIdSchema,
    normalizedEntityId: NormalizedEntityIdSchema,
    snapshotId: SnapshotIdSchema,
    engagementScore: z.number().nullable(),
    insufficientData: z.boolean(),
  })
  .strict();

/** In-memory embedding row for worker signal planning. */
export const ResearchEmbeddingRowSchema = z
  .object({
    id: EmbeddingVectorIdSchema,
    normalizedEntityId: NormalizedEntityIdSchema,
  })
  .strict();

/** Planned signal before INSERT (worker internal). */
export const ResearchSignalCandidateSchema = z
  .object({
    sourceEntityId: NormalizedEntityIdSchema.optional(),
    sourceSnapshotId: SnapshotIdSchema.optional(),
    signalType: ResearchSignalTypeSchema,
    score: z.number(),
    payloadJson: z.record(z.unknown()).default({}),
  })
  .strict();
export type ResearchSignalCandidate = z.infer<typeof ResearchSignalCandidateSchema>;
