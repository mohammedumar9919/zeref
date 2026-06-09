import { z } from "zod";
import { ResearchTopicIdSchema } from "../ids.js";

/** Worker `research` job input (ADR-032, Amendment L). */
export const ResearchJobInputSchema = z
  .object({
    jobType: z.literal("research"),
    topicId: ResearchTopicIdSchema.optional(),
  })
  .strict();
export type ResearchJobInput = z.infer<typeof ResearchJobInputSchema>;

/** Worker `research` job result after topic aggregate update. */
export const ResearchJobOutputSchema = z
  .object({
    topicId: ResearchTopicIdSchema,
    signalsWritten: z.number().int().nonnegative(),
    signalCount: z.number().int().nonnegative(),
    trendScore: z.number().nullable(),
    lastComputedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type ResearchJobOutput = z.infer<typeof ResearchJobOutputSchema>;

/** BFF enqueue allowlist extension (Amendment L) — Phase 9 only. */
export const UiJobTypeSchemaV9 = z.enum([
  "normalize",
  "embed",
  "analyze",
  "report",
  "research",
]);
export type UiJobTypeV9 = z.infer<typeof UiJobTypeSchemaV9>;

export const JobEnqueueRequestSchemaV9 = z
  .object({
    jobType: UiJobTypeSchemaV9,
    topicId: ResearchTopicIdSchema.optional(),
    snapshotId: z.string().uuid().optional(),
    entityId: z.string().uuid().optional(),
    calendarEventId: z.string().uuid().optional(),
  })
  .strict();
export type JobEnqueueRequestV9 = z.infer<typeof JobEnqueueRequestSchemaV9>;
