import { z } from "zod";
import { PlatformSchema, SnapshotKindSchema } from "../enums.js";
import { PlatformAccountIdSchema } from "../ids.js";

/** Collect stage — only job type that may carry a raw payload blob. */
export const CollectJobInputSchema = z.object({
  jobType: z.literal("collect"),
  platform: PlatformSchema,
  kind: SnapshotKindSchema,
  platformAccountId: PlatformAccountIdSchema.optional(),
  sourceRef: z.string().min(1),
  contentHash: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  collectedAt: z.string().datetime(),
});
export type CollectJobInput = z.infer<typeof CollectJobInputSchema>;
