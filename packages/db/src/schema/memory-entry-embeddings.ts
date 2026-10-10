import { index, pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";
import { EMBEDDING_DIMENSIONS } from "./embedding-vectors.js";
import { memoryEntries } from "./memory-entries.js";

/**
 * One embedding per memory entry (CLOUD-C4). Deleting the entry (vault forget)
 * cascades here; `embedding_vectors` stays append-only and is not used for memory.
 */
export const memoryEntryEmbeddings = pgTable(
  "memory_entry_embeddings",
  {
    entryId: uuid("entry_id")
      .primaryKey()
      .references(() => memoryEntries.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
    contentHash: text("content_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("memory_entry_embeddings_model_idx").on(t.model)],
);
