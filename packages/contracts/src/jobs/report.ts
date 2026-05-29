import { z } from "zod";
import {
  AnalysisOutputIdSchema,
  NormalizedEntityIdSchema,
  ReportArtifactIdSchema,
  SnapshotIdSchema,
} from "../ids.js";
import { InsufficientDataSchema } from "../insufficient-data.js";
import { withRawBlobGuard } from "../raw-blob-guard.js";

/** Report stage — immutable upstream IDs only; optional insufficient_data pathway. */
export const ReportJobInputSchema = withRawBlobGuard(
  z
    .object({
      jobType: z.literal("report"),
      schemaVersion: z.string().min(1),
      analysisOutputId: AnalysisOutputIdSchema.optional(),
      normalizedEntityId: NormalizedEntityIdSchema.optional(),
      snapshotId: SnapshotIdSchema.optional(),
      artifactKind: z.string().min(1).optional(),
      includeJarvisBrief: z.boolean().optional(),
      insufficientData: InsufficientDataSchema.optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (
        !data.analysisOutputId &&
        !data.normalizedEntityId &&
        !data.snapshotId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "ReportJobInput requires analysisOutputId, normalizedEntityId, and/or snapshotId.",
        });
      }
    }),
);
export type ReportJobInput = z.infer<typeof ReportJobInputSchema>;

/** Report job result after INSERT (C17 / C23). */
export const ReportJobOutputSchema = z
  .object({
    reportArtifactIds: z
      .object({
        elite: ReportArtifactIdSchema,
        jarvisBrief: ReportArtifactIdSchema.optional(),
      })
      .strict(),
    analysisOutputId: AnalysisOutputIdSchema,
  })
  .strict();
export type ReportJobOutput = z.infer<typeof ReportJobOutputSchema>;
