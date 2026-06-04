import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { normalizedEntities } from "./normalized-entities.js";

/** Studio draft overlay — keyed by normalized entity (ADR-028 / C78). */
export const studioDrafts = pgTable(
  "studio_drafts",
  {
    entityId: uuid("entity_id")
      .primaryKey()
      .references(() => normalizedEntities.id, { onDelete: "cascade" }),
    caption: text("caption").notNull().default(""),
    notes: text("notes").notNull().default(""),
    tagsJson: jsonb("tags_json").$type<string[]>().default([]).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("studio_drafts_updated_at_idx").on(t.updatedAt)],
);
