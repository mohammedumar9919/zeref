import { z } from "zod";
import {
  MetricFactIdSchema,
  NormalizedEntityIdSchema,
  PlatformAccountIdSchema,
  SnapshotIdSchema,
} from "../ids.js";
import { withRawBlobGuard } from "../raw-blob-guard.js";

/** Normalize stage — references immutable snapshot ID only (C6). */
export const NormalizeJobInputSchema = withRawBlobGuard(
  z
    .object({
      jobType: z.literal("normalize"),
      snapshotId: SnapshotIdSchema,
      schemaVersion: z.string().min(1),
    })
    .strict(),
);
export type NormalizeJobInput = z.infer<typeof NormalizeJobInputSchema>;

/** Normalize job result after INSERT (C11). */
export const NormalizeJobOutputSchema = z
  .object({
    normalizedEntityId: NormalizedEntityIdSchema,
    snapshotId: SnapshotIdSchema,
    metricFactId: MetricFactIdSchema.optional(),
    insufficientData: z.boolean().optional(),
    platformAccountId: PlatformAccountIdSchema.optional(),
  })
  .strict();
export type NormalizeJobOutput = z.infer<typeof NormalizeJobOutputSchema>;
