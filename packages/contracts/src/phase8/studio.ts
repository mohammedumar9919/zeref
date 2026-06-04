import { z } from "zod";
import { NormalizedEntityIdSchema } from "../ids.js";

/** Studio draft overlay — never mutates snapshots (ADR-028 / C78). */
export const StudioDraftSchema = z
  .object({
    entityId: NormalizedEntityIdSchema,
    caption: z.string().default(""),
    notes: z.string().default(""),
    tags: z.array(z.string()).default([]),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type StudioDraft = z.infer<typeof StudioDraftSchema>;
