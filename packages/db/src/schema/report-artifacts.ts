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
import { analysisOutputs } from "./analysis-outputs.js";
import { normalizedEntities } from "./normalized-entities.js";
import { snapshots } from "./snapshots.js";

/** Report-stage stored artifact (C2); append-only. */
export const reportArtifacts = pgTable(
  "report_artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisOutputId: uuid("analysis_output_id").references(() => analysisOutputs.id, {
      onDelete: "restrict",
    }),
    normalizedEntityId: uuid("normalized_entity_id").references(() => normalizedEntities.id, {
      onDelete: "restrict",
    }),
    snapshotId: uuid("snapshot_id").references(() => snapshots.id, { onDelete: "restrict" }),
    schemaVersion: text("schema_version").notNull(),
    artifactKind: text("artifact_kind").notNull(),
    payloadJson: jsonb("payload_json").$type<unknown>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("report_artifacts_analysis_output_id_idx").on(t.analysisOutputId),
    index("report_artifacts_normalized_entity_id_idx").on(t.normalizedEntityId),
    index("report_artifacts_snapshot_id_idx").on(t.snapshotId),
    index("report_artifacts_artifact_kind_idx").on(t.artifactKind),
    check(
      "report_artifacts_lineage_chk",
      sql`${t.analysisOutputId} IS NOT NULL OR ${t.normalizedEntityId} IS NOT NULL OR ${t.snapshotId} IS NOT NULL`,
    ),
  ],
);
