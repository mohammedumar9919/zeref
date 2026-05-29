import { z } from "zod";

/** Graph API `GET /{ig-user-id}` MVP fields (Q2). */
export const GraphIgUserSchema = z
  .object({
    id: z.string().min(1),
    username: z.string().min(1),
  })
  .strict();
export type GraphIgUser = z.infer<typeof GraphIgUserSchema>;

/** Graph API media object fields (Q2). */
export const GraphMediaFieldsSchema = z
  .object({
    id: z.string().min(1),
    caption: z.string().optional(),
    media_type: z.string().min(1),
    media_url: z.string().min(1).optional(),
    permalink: z.string().min(1),
    timestamp: z.string().min(1),
    like_count: z.number().int().nonnegative().optional(),
    comments_count: z.number().int().nonnegative().optional(),
  })
  .strict();
export type GraphMediaFields = z.infer<typeof GraphMediaFieldsSchema>;

/** Graph API `GET /{ig-user-id}/media` list wrapper. */
export const GraphMediaListResponseSchema = z
  .object({
    data: z.array(GraphMediaFieldsSchema),
  })
  .strict();
export type GraphMediaListResponse = z.infer<typeof GraphMediaListResponseSchema>;
