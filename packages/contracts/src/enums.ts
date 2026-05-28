import { z } from "zod";

/** Phase 1: Instagram only. */
export const PlatformSchema = z.enum(["instagram"]);
export type Platform = z.infer<typeof PlatformSchema>;

/** Aligns with `snapshots.kind` text column in @zeref/db. */
export const SnapshotKindSchema = z.enum([
  "instagram_post_raw",
  "instagram_profile_raw",
]);
export type SnapshotKind = z.infer<typeof SnapshotKindSchema>;

export const PipelineStageSchema = z.enum([
  "collect",
  "normalize",
  "analyze",
  "report",
]);
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

/** One job type per pipeline stage. */
export const JobTypeSchema = PipelineStageSchema;
export type JobType = z.infer<typeof JobTypeSchema>;
