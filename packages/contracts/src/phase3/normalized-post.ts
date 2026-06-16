import { z } from "zod";
import { CollectSourceSchema } from "../instagram/collect-source.js";
import { PlatformAccountIdSchema } from "../ids.js";

/** Normalize-stage entity stored in `normalized_entities.payload_json`. */
export const NormalizedPostPayloadSchema = z
  .object({
    shortcode: z.string().min(1),
    platformAccountId: PlatformAccountIdSchema.optional(),
    sources: z.array(CollectSourceSchema).min(1),
    caption: z.string().optional(),
    likes: z.number().int().nonnegative().optional(),
    comments: z.number().int().nonnegative().optional(),
    mediaType: z.string().optional(),
    thumbnailUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
    carouselUrls: z.array(z.string().url()).optional(),
    schemaVersion: z.string().min(1),
  })
  .strict();

export type NormalizedPostPayload = z.infer<typeof NormalizedPostPayloadSchema>;
