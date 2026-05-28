import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { snapshots } from "./snapshots.js";

/** Normalize-stage output; append-only. */
export const normalizedEntities = pgTable(
  "normalized_entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => snapshots.id, { onDelete: "restrict" }),
    schemaVersion: text("schema_version").notNull(),
    payloadJson: jsonb("payload_json").$type<unknown>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("normalized_entities_snapshot_id_idx").on(t.snapshotId),
    index("normalized_entities_schema_version_idx").on(t.schemaVersion),
  ],
);
