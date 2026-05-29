import { z } from "zod";
import { CollectSourceSchema } from "./collect-source.js";
import { GraphMediaFieldsSchema } from "./graph.js";
import { ScrapePostFieldsSchema } from "./scrape.js";

/**
 * One merged snapshot payload per shortcode (Q1 / ADR-004).
 * Stored on `snapshots.payload_json` for `instagram_post_raw`.
 */
export const MergedInstagramPostPayloadSchema = z
  .object({
    shortcode: z.string().min(1),
    sources: z.array(CollectSourceSchema).min(1),
    graph: GraphMediaFieldsSchema.optional(),
    scrape: ScrapePostFieldsSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.graph && !data.scrape) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MergedInstagramPostPayload requires graph and/or scrape",
      });
    }
  });
export type MergedInstagramPostPayload = z.infer<
  typeof MergedInstagramPostPayloadSchema
>;
