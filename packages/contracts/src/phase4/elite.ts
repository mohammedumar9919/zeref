import { z } from "zod";
import { MetricFactIdSchema, PlatformAccountIdSchema } from "../ids.js";

export const EliteCitationSchema = z
  .object({
    metricFactId: MetricFactIdSchema,
    label: z.string().min(1),
  })
  .strict();

export const EliteCitationIndexEntrySchema = z
  .object({
    id: z.string().min(1),
    metricFactId: MetricFactIdSchema,
    value: z.number(),
  })
  .strict();

export const EliteRecommendationSchema = z
  .object({
    text: z.string().min(1),
    priority: z.enum(["high", "medium", "low"]),
  })
  .strict();

/** Phase 4 elite report JSON (C17 / C20). */
export const EliteReportSchema = z
  .object({
    schemaVersion: z.literal("phase4-elite-v1"),
    accountRef: z
      .object({
        platformAccountId: PlatformAccountIdSchema,
      })
      .strict(),
    period: z
      .object({
        start: z.string().datetime({ offset: true }),
        end: z.string().datetime({ offset: true }),
      })
      .strict(),
    headline: z
      .object({
        text: z.string(),
        insufficientData: z.boolean(),
      })
      .strict(),
    engagement: z
      .object({
        score: z.number().nullable(),
        vsCohort: z.enum(["above", "below", "inline", "unknown"]),
        citations: z.array(EliteCitationSchema),
      })
      .strict(),
    niche: z
      .object({
        pillars: z.array(z.string()),
        citations: z.array(EliteCitationSchema),
      })
      .strict(),
    cohort: z
      .object({
        label: z.string(),
        sampleSize: z.number().int().nonnegative(),
        citations: z.array(EliteCitationSchema),
      })
      .strict(),
    recommendations: z.array(EliteRecommendationSchema),
    narrative: z
      .object({
        markdown: z.string(),
        citationIndex: z.array(EliteCitationIndexEntrySchema),
      })
      .strict(),
    insufficientData: z.boolean(),
  })
  .strict();

export type EliteReport = z.infer<typeof EliteReportSchema>;
