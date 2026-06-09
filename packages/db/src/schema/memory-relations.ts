import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { memoryEntities } from "./memory-entities.js";

/** Entity graph edge (ADR-025). */
export const memoryRelations = pgTable(
  "memory_relations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromEntityId: uuid("from_entity_id")
      .notNull()
      .references(() => memoryEntities.id, { onDelete: "cascade" }),
    toEntityId: uuid("to_entity_id")
      .notNull()
      .references(() => memoryEntities.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(),
    metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("memory_relations_from_entity_id_idx").on(t.fromEntityId),
    index("memory_relations_to_entity_id_idx").on(t.toEntityId),
    index("memory_relations_relation_type_idx").on(t.relationType),
  ],
);
