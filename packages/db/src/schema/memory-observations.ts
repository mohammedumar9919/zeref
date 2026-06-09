import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { memoryEntries } from "./memory-entries.js";

/** Contradiction / supersession metadata (ADR-025). */
export const memoryObservations = pgTable(
  "memory_observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => memoryEntries.id, { onDelete: "cascade" }),
    supersededEntryId: uuid("superseded_entry_id").references(() => memoryEntries.id, {
      onDelete: "set null",
    }),
    observationType: text("observation_type").notNull(),
    metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("memory_observations_entry_id_idx").on(t.entryId),
    index("memory_observations_superseded_entry_id_idx").on(t.supersededEntryId),
  ],
);
