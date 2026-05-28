import { z } from "zod";
import { SnapshotIdSchema } from "../ids.js";
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
