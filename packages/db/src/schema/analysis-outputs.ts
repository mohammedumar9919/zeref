import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { normalizedEntities } from "./normalized-entities.js";
import { snapshots } from "./snapshots.js";

/** Analyze-stage output; append-only. */
export const analysisOutputs = pgTable(
  "analysis_outputs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    normalizedEntityId: uuid("normalized_entity_id").references(() => normalizedEntities.id, {
      onDelete: "restrict",
    }),
    snapshotId: uuid("snapshot_id").references(() => snapshots.id, { onDelete: "restrict" }),
    schemaVersion: text("schema_version").notNull(),
    payloadJson: jsonb("payload_json").$type<unknown>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("analysis_outputs_normalized_entity_id_idx").on(t.normalizedEntityId),
    index("analysis_outputs_snapshot_id_idx").on(t.snapshotId),
    index("analysis_outputs_schema_version_idx").on(t.schemaVersion),
    check(
      "analysis_outputs_lineage_chk",
      sql`${t.normalizedEntityId} IS NOT NULL OR ${t.snapshotId} IS NOT NULL`,
    ),
  ],
);
