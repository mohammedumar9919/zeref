import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { memoryEntities } from "./memory-entities.js";

/** 4-tier memory entry (ADR-025). */
export const memoryEntries = pgTable(
  "memory_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tier: text("tier").notNull(),
    content: text("content").notNull(),
    source: text("source").notNull(),
    entityId: uuid("entity_id").references(() => memoryEntities.id, {
      onDelete: "set null",
    }),
    valueKey: text("value_key"),
    value: text("value"),
    temporalScore: numeric("temporal_score", { precision: 8, scale: 6 }).notNull(),
    observation: text("observation").notNull().default("verified"),
    metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("memory_entries_tier_idx").on(t.tier),
    index("memory_entries_entity_id_idx").on(t.entityId),
    index("memory_entries_observation_idx").on(t.observation),
    index("memory_entries_created_at_idx").on(t.createdAt),
  ],
);
