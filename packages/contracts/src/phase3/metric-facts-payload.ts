import { z } from "zod";
import {
  NormalizedEntityIdSchema,
  PlatformAccountIdSchema,
  SnapshotIdSchema,
} from "../ids.js";

/** Extensible facts blob inside `metric_facts.facts_json`. */
export const MetricFactsFactsJsonSchema = z
  .object({
    shortcode: z.string().min(1),
    sources: z.array(z.string()).min(1),
    engagementReason: z.string().optional(),
    cohortBaseline: z.number().optional(),
    relativeEngagement: z.number().optional(),
  })
  .strict()
  .passthrough();

export type MetricFactsFactsJson = z.infer<typeof MetricFactsFactsJsonSchema>;

/**
 * Metric row payload shape (Q3) — includes `platformAccountId` FK lineage.
 */
export const MetricFactsPayloadSchema = z
  .object({
    platformAccountId: PlatformAccountIdSchema,
    snapshotId: SnapshotIdSchema,
    normalizedEntityId: NormalizedEntityIdSchema,
    metricVersion: z.string().min(1),
    engagementScore: z.number().nullable(),
    nicheTags: z.array(z.string()),
    insufficientData: z.boolean(),
    factsJson: MetricFactsFactsJsonSchema,
  })
  .strict();

export type MetricFactsPayload = z.infer<typeof MetricFactsPayloadSchema>;
