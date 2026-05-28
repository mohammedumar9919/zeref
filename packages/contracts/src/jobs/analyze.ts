import { z } from "zod";
import { NormalizedEntityIdSchema, SnapshotIdSchema } from "../ids.js";
import { InsufficientDataSchema } from "../insufficient-data.js";
import { withRawBlobGuard } from "../raw-blob-guard.js";

const AnalyzeJobInputBaseSchema = withRawBlobGuard(
  z
    .object({
      jobType: z.literal("analyze"),
      schemaVersion: z.string().min(1),
      normalizedEntityId: NormalizedEntityIdSchema.optional(),
      snapshotId: SnapshotIdSchema.optional(),
      insufficientData: InsufficientDataSchema.optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (!data.normalizedEntityId && !data.snapshotId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "AnalyzeJobInput requires normalizedEntityId and/or snapshotId.",
        });
      }
    }),
);

/** Analyze stage — immutable IDs only; optional insufficient_data pathway. */
export const AnalyzeJobInputSchema = AnalyzeJobInputBaseSchema;
export type AnalyzeJobInput = z.infer<typeof AnalyzeJobInputSchema>;
