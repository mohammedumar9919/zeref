import { isNull } from "drizzle-orm";
import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
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
    /** C19a: the entry that replaced this one. Vault forget nulls it (never cascades). */
    supersededBy: uuid("superseded_by").references((): AnyPgColumn => memoryEntries.id, {
      onDelete: "set null",
    }),
    /** C19a: archived entries are hidden from search by default; never deleted. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("memory_entries_tier_idx").on(t.tier),
    index("memory_entries_entity_id_idx").on(t.entityId),
    index("memory_entries_observation_idx").on(t.observation),
    index("memory_entries_created_at_idx").on(t.createdAt),
    index("memory_entries_superseded_by_idx").on(t.supersededBy),
    index("memory_entries_active_idx").on(t.createdAt).where(isNull(t.archivedAt)),
  ],
);
