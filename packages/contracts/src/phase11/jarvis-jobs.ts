import { z } from "zod";
import { NormalizedEntityIdSchema, ResearchTopicIdSchema, SnapshotIdSchema } from "../ids.js";
import { UiJobTypeSchema } from "../phase8/jobs.js";
import { UiJobTypeSchemaV9 } from "../phase9/jobs.js";

/**
 * Jarvis-confirmed enqueue allowlist (ADR-030 amendment, CLOUD-C2).
 * UI allowlist ∪ `collect` — only valid after the kernel's write-high confirm.
 * Never use for `POST /api/v1/jobs/enqueue`.
 */
export const JarvisJobTypeSchema = z.enum([...UiJobTypeSchema.options, "collect"]);
export type JarvisJobType = z.infer<typeof JarvisJobTypeSchema>;

/** Phase 9 variant — keeps `research` reachable via Jarvis when ZEREF_PHASE9_RESEARCH=1. */
export const JarvisJobTypeSchemaV9 = z.enum([...UiJobTypeSchemaV9.options, "collect"]);
export type JarvisJobTypeV9 = z.infer<typeof JarvisJobTypeSchemaV9>;

const jarvisEnqueueFields = {
  snapshotId: SnapshotIdSchema.optional(),
  entityId: NormalizedEntityIdSchema.optional(),
  calendarEventId: z.string().uuid().optional(),
  /** `collect` only — target a specific Graph media id (else newest is resolved server-side). */
  graphMediaId: z.string().min(1).optional(),
  /** `collect` only — target posts by shortcode. */
  shortcodes: z.array(z.string().min(1)).min(1).optional(),
};

export const JarvisJobEnqueueRequestSchema = z
  .object({
    jobType: JarvisJobTypeSchema,
    ...jarvisEnqueueFields,
  })
  .strict();
export type JarvisJobEnqueueRequest = z.infer<typeof JarvisJobEnqueueRequestSchema>;

export const JarvisJobEnqueueRequestSchemaV9 = z
  .object({
    jobType: JarvisJobTypeSchemaV9,
    topicId: ResearchTopicIdSchema.optional(),
    ...jarvisEnqueueFields,
  })
  .strict();
export type JarvisJobEnqueueRequestV9 = z.infer<typeof JarvisJobEnqueueRequestSchemaV9>;
