import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { normalizedEntities } from "./normalized-entities.js";
import { snapshots } from "./snapshots.js";
import { researchTopics } from "./research-topics.js";

/** Research signals derived from metric_facts / embeddings (ADR-031). */
export const researchSignals = pgTable(
  "research_signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => researchTopics.id, { onDelete: "cascade" }),
    sourceEntityId: uuid("source_entity_id").references(() => normalizedEntities.id, {
      onDelete: "set null",
    }),
    sourceSnapshotId: uuid("source_snapshot_id").references(() => snapshots.id, {
      onDelete: "set null",
    }),
    signalType: text("signal_type").notNull(),
    score: numeric("score", { precision: 12, scale: 6 }).notNull(),
    payloadJson: jsonb("payload_json")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("research_signals_topic_id_idx").on(t.topicId),
    index("research_signals_computed_at_idx").on(t.computedAt),
    index("research_signals_signal_type_idx").on(t.signalType),
  ],
);
