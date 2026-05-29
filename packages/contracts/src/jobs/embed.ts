import { z } from "zod";
import { EmbeddingVectorIdSchema, NormalizedEntityIdSchema } from "../ids.js";
import { withRawBlobGuard } from "../raw-blob-guard.js";

/** Embed stage — normalized entity ID only (C14 / ADR-008). */
export const EmbedJobInputSchema = withRawBlobGuard(
  z
    .object({
      jobType: z.literal("embed"),
      normalizedEntityId: NormalizedEntityIdSchema,
      model: z.string().min(1).optional(),
      schemaVersion: z.string().min(1),
    })
    .strict(),
);
export type EmbedJobInput = z.infer<typeof EmbedJobInputSchema>;

/** Embed job result after INSERT into `embedding_vectors` (C11). */
export const EmbedJobOutputSchema = z
  .object({
    embeddingVectorId: EmbeddingVectorIdSchema,
    normalizedEntityId: NormalizedEntityIdSchema,
    model: z.string().min(1),
    contentHash: z.string().min(1),
    dimensions: z.literal(1536),
  })
  .strict();
export type EmbedJobOutput = z.infer<typeof EmbedJobOutputSchema>;
