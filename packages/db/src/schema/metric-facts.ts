import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { normalizedEntities } from "./normalized-entities.js";
import { platformAccounts } from "./platform-accounts.js";
import { snapshots } from "./snapshots.js";

/** Normalize-stage analytics facts (Q3); append-only. */
export const metricFacts = pgTable(
  "metric_facts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => snapshots.id, { onDelete: "restrict" }),
    normalizedEntityId: uuid("normalized_entity_id")
      .notNull()
      .references(() => normalizedEntities.id, { onDelete: "restrict" }),
    platformAccountId: uuid("platform_account_id")
      .notNull()
      .references(() => platformAccounts.id, { onDelete: "restrict" }),
    metricVersion: text("metric_version").notNull(),
    engagementScore: numeric("engagement_score", { precision: 12, scale: 6 }),
    nicheTags: jsonb("niche_tags").$type<string[]>().notNull().default([]),
    insufficientData: boolean("insufficient_data").notNull().default(false),
    factsJson: jsonb("facts_json").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("metric_facts_snapshot_id_idx").on(t.snapshotId),
    index("metric_facts_normalized_entity_id_idx").on(t.normalizedEntityId),
    index("metric_facts_platform_account_id_idx").on(t.platformAccountId),
    index("metric_facts_metric_version_idx").on(t.metricVersion),
  ],
);
