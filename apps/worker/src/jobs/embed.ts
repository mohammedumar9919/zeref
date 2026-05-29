import {
  EmbedJobInputSchema,
  EmbeddingVectorIdSchema,
  NormalizedPostPayloadSchema,
  type EmbedJobInput,
  type EmbedJobOutput,
  type NormalizedEntityId,
} from "@zeref/contracts";
import {
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  embeddingVectors,
  normalizedEntities,
  schema,
} from "@zeref/db";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { embedContentHash, embedText } from "../lib/embed-provider.js";
import { embedTextFromNormalized } from "../lib/embed-text.js";

export type EmbedHandlerDeps = {
  pool: Pool;
  embedModel?: string;
};

function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

/**
 * Embed handler: normalized entity by ID → provider → INSERT embedding_vectors (C14).
 * Does not read snapshots or import @zeref/instagram (ADR-009).
 */
export async function runEmbed(
  rawInput: unknown,
  deps: EmbedHandlerDeps,
): Promise<EmbedJobOutput> {
  const parsed = EmbedJobInputSchema.parse(rawInput);
  const model = parsed.model ?? deps.embedModel ?? DEFAULT_EMBEDDING_MODEL;
  const input: EmbedJobInput = { ...parsed, model };

  const db = drizzle(deps.pool, { schema });

  const entityRows = await db
    .select()
    .from(normalizedEntities)
    .where(eq(normalizedEntities.id, input.normalizedEntityId))
    .limit(1);

  const entity = entityRows[0];
  if (!entity) {
    throw new Error(`normalized entity not found: ${input.normalizedEntityId}`);
  }

  const normalizedPayload = NormalizedPostPayloadSchema.parse(entity.payloadJson);
  const text = embedTextFromNormalized(normalizedPayload);
  const contentHash = embedContentHash(text, model);

  const existing = await db
    .select({
      id: embeddingVectors.id,
      contentHash: embeddingVectors.contentHash,
      model: embeddingVectors.model,
      dimensions: embeddingVectors.dimensions,
    })
    .from(embeddingVectors)
    .where(
      and(
        eq(embeddingVectors.normalizedEntityId, input.normalizedEntityId),
        eq(embeddingVectors.model, model),
      ),
    )
    .limit(1);

  const existingRow = existing[0];
  if (existingRow) {
    return {
      embeddingVectorId: EmbeddingVectorIdSchema.parse(existingRow.id),
      normalizedEntityId: input.normalizedEntityId,
      model: existingRow.model,
      contentHash: existingRow.contentHash,
      dimensions: EMBEDDING_DIMENSIONS,
    };
  }

  const { embedding } = await embedText(text, model);
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`embedding length ${embedding.length} !== ${EMBEDDING_DIMENSIONS}`);
  }

  const literal = vectorLiteral(embedding);
  const inserted = await deps.pool.query<{
    id: string;
    content_hash: string;
    model: string;
  }>(
    `INSERT INTO embedding_vectors (normalized_entity_id, model, dimensions, embedding, content_hash)
     VALUES ($1, $2, $3, $4::vector, $5)
     RETURNING id, content_hash, model`,
    [input.normalizedEntityId, model, EMBEDDING_DIMENSIONS, literal, contentHash],
  );

  const row = inserted.rows[0];
  if (!row) {
    throw new Error("embedding_vectors INSERT returned no row");
  }

  return {
    embeddingVectorId: EmbeddingVectorIdSchema.parse(row.id),
    normalizedEntityId: input.normalizedEntityId as NormalizedEntityId,
    model: row.model,
    contentHash: row.content_hash,
    dimensions: EMBEDDING_DIMENSIONS,
  };
}

export function createEmbedHandler(deps: EmbedHandlerDeps) {
  return async (job: { data: unknown }): Promise<EmbedJobOutput> => runEmbed(job.data, deps);
}
