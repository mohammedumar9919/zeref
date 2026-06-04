import { z } from "zod";
import { NormalizedEntityIdSchema, SnapshotIdSchema } from "../ids.js";

/** UI allowlist — excludes `collect` (Amendment F / ADR-030). */
export const UiJobTypeSchema = z.enum([
  "normalize",
  "embed",
  "analyze",
  "report",
]);
export type UiJobType = z.infer<typeof UiJobTypeSchema>;

/**
 * BFF enqueue body (ADR-030).
 * `collect` rejected at schema layer via `UiJobTypeSchema` enum — not in allowlist.
 */
export const JobEnqueueRequestSchema = z
  .object({
    jobType: UiJobTypeSchema,
    snapshotId: SnapshotIdSchema.optional(),
    entityId: NormalizedEntityIdSchema.optional(),
    calendarEventId: z.string().uuid().optional(),
  })
  .strict();
export type JobEnqueueRequest = z.infer<typeof JobEnqueueRequestSchema>;
