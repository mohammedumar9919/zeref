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
  "engagement_outlier",
  "caption_hook",
  "weekly_brief",
  "competitor_graph",
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

/** Own-account outlier vs median (CLOUD-A3). */
export const ResearchOutlierSchema = z
  .object({
    factId: z.string().min(1),
    sourceEntityId: NormalizedEntityIdSchema.optional(),
    sourceSnapshotId: SnapshotIdSchema.optional(),
    value: z.number(),
    median: z.number(),
    multiplier: z.number(),
    shortcode: z.string().optional(),
    caption: z.string().optional(),
  })
  .strict();
export type ResearchOutlier = z.infer<typeof ResearchOutlierSchema>;

export const ResearchHookScoreSchema = z
  .object({
    caption: z.string(),
    score: z.number().min(0).max(10),
    mocked: z.boolean(),
    rationale: z.string().optional(),
  })
  .strict();
export type ResearchHookScore = z.infer<typeof ResearchHookScoreSchema>;

export const ResearchWeeklyBriefSchema = z
  .object({
    text: z.string().min(1),
    groundedIn: z.array(z.string()),
    mocked: z.boolean(),
  })
  .strict();
export type ResearchWeeklyBrief = z.infer<typeof ResearchWeeklyBriefSchema>;

export const ResearchCompetitorSchema = z
  .object({
    handle: z.string().min(1),
    source: z.enum(["fixture", "graph"]),
    skippedReason: z.string().optional(),
  })
  .strict();
export type ResearchCompetitor = z.infer<typeof ResearchCompetitorSchema>;

/** Hub + JARVIS intel DTO (fixture or derived from signals). */
export const ResearchIntelSchema = z
  .object({
    topicId: ResearchTopicIdSchema.optional(),
    outliers: z.array(ResearchOutlierSchema),
    hooks: z.array(ResearchHookScoreSchema),
    weeklyBrief: ResearchWeeklyBriefSchema.optional(),
    competitor: ResearchCompetitorSchema.optional(),
  })
  .strict();
export type ResearchIntel = z.infer<typeof ResearchIntelSchema>;
