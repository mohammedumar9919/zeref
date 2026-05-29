import { z } from "zod";

/** Scrape-shaped post fields (ADR-004; camelCase). */
export const ScrapePostFieldsSchema = z
  .object({
    shortcode: z.string().min(1),
    caption: z.string().optional(),
    likes: z.number().int().nonnegative().optional(),
    comments: z.number().int().nonnegative().optional(),
    thumbnailUrl: z.string().min(1).optional(),
    videoUrl: z.string().min(1).optional(),
    carouselUrls: z.array(z.string().min(1)).optional(),
  })
  .strict();
export type ScrapePostFields = z.infer<typeof ScrapePostFieldsSchema>;
