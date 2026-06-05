import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { normalizedEntities } from "./normalized-entities.js";

/** Research trend topics (ADR-031). */
export const researchTopics = pgTable(
  "research_topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    scopeEntityId: uuid("scope_entity_id").references(() => normalizedEntities.id, {
      onDelete: "set null",
    }),
    trendScore: numeric("trend_score", { precision: 12, scale: 6 }),
    signalCount: integer("signal_count").notNull().default(0),
    lastComputedAt: timestamp("last_computed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("research_topics_scope_entity_id_idx").on(t.scopeEntityId),
    index("research_topics_last_computed_at_idx").on(t.lastComputedAt),
  ],
);
