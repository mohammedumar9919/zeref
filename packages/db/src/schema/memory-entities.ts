import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Named entity in the memory graph (ADR-025). */
export const memoryEntities = pgTable(
  "memory_entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    stateJson: jsonb("state_json").$type<Record<string, unknown>>().default({}).notNull(),
    transitionHistory: jsonb("transition_history")
      .$type<Array<{ ts: string; patch: Record<string, unknown> }>>()
      .default([])
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("memory_entities_type_idx").on(t.type),
    index("memory_entities_name_idx").on(t.name),
  ],
);
