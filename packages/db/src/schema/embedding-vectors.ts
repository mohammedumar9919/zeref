import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { normalizedEntities } from "./normalized-entities.js";

/** Locked embedding width for OpenAI text-embedding-3-small (C16). */
export const EMBEDDING_DIMENSIONS = 1536 as const;

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small" as const;

/** Embed-stage vectors (C16); append-only. */
export const embeddingVectors = pgTable(
  "embedding_vectors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    normalizedEntityId: uuid("normalized_entity_id")
      .notNull()
      .references(() => normalizedEntities.id, { onDelete: "restrict" }),
    model: text("model").notNull(),
    dimensions: integer("dimensions").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
    contentHash: text("content_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("embedding_vectors_entity_model_uq").on(t.normalizedEntityId, t.model),
    index("embedding_vectors_content_hash_idx").on(t.contentHash),
    check("embedding_vectors_dimensions_chk", sql`${t.dimensions} = ${EMBEDDING_DIMENSIONS}`),
  ],
);
