import { z } from "zod";

import { NormalizedEntityIdSchema } from "../ids.js";

export const ENGAGEMENT_TREND_MAX_POINTS = 30;
/** Fewer scored points than this and the trend is labelled insufficient. */
export const ENGAGEMENT_TREND_MIN_SCORED = 3;

/**
 * `published` = Graph media timestamp; `collected` = the snapshot collect time,
 * used only when the raw post has no timestamp (never presented as publish time).
 */
export const EngagementTrendTimeBasisSchema = z.enum(["published", "collected"]);
export type EngagementTrendTimeBasis = z.infer<typeof EngagementTrendTimeBasisSchema>;

export const EngagementTrendPointSchema = z
  .object({
    entityId: NormalizedEntityIdSchema,
    title: z.string().min(1),
    at: z.string().datetime({ offset: true }),
    timeBasis: EngagementTrendTimeBasisSchema,
    engagementScore: z.number().nullable(),
  })
  .strict();
export type EngagementTrendPoint = z.infer<typeof EngagementTrendPointSchema>;

export const EngagementTrendSchema = z
  .object({
    points: z.array(EngagementTrendPointSchema).max(ENGAGEMENT_TREND_MAX_POINTS),
    median: z.number().nullable(),
    source: z.enum(["fixture", "live"]),
    insufficientData: z.boolean(),
  })
  .strict()
  .superRefine((trend, ctx) => {
    for (let i = 1; i < trend.points.length; i += 1) {
      if (Date.parse(trend.points[i - 1].at) > Date.parse(trend.points[i].at)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "points must be sorted by time ascending",
          path: ["points", i, "at"],
        });
        return;
      }
    }
  });
export type EngagementTrend = z.infer<typeof EngagementTrendSchema>;
