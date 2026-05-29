import { z } from "zod";
import { CollectSourceSchema } from "../instagram/collect-source.js";
import { PlatformSchema, SnapshotKindSchema } from "../enums.js";
import { PlatformAccountIdSchema, SnapshotIdSchema } from "../ids.js";

/**
 * Collect job request (Phase 2).
 * Worker fetches graph/scrape, merges, INSERTs snapshot — no raw blob on input.
 */
export const CollectJobInputSchema = z
  .object({
    jobType: z.literal("collect"),
    platform: PlatformSchema,
    kind: SnapshotKindSchema,
    platformAccountId: PlatformAccountIdSchema.optional(),
    sources: z.array(CollectSourceSchema).min(1),
    shortcodes: z.array(z.string().min(1)).optional(),
    graphMediaId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const uniqueSources = new Set(data.sources);
    if (uniqueSources.size !== data.sources.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sources must not contain duplicates",
      });
    }

    if (data.kind === "instagram_post_raw") {
      if (data.sources.includes("scrape") && !data.shortcodes?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scrape collect for posts requires shortcodes",
        });
      }
      if (
        data.sources.includes("graph") &&
        !data.shortcodes?.length &&
        !data.graphMediaId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "graph collect for posts requires shortcodes and/or graphMediaId",
        });
      }
    }
  });
export type CollectJobInput = z.infer<typeof CollectJobInputSchema>;

/** Collect job result after immutable snapshot INSERT (C7). */
export const CollectJobOutputSchema = z
  .object({
    snapshotId: SnapshotIdSchema,
    contentHash: z.string().min(1),
    shortcode: z.string().min(1).optional(),
  })
  .strict();
export type CollectJobOutput = z.infer<typeof CollectJobOutputSchema>;
