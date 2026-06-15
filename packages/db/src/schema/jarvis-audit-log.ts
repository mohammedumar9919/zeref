import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { jarvisAgentRuns } from "./jarvis-agent-runs.js";

/** Auditable tool invocation log (ADR-040, C152). */
export const jarvisAuditLog = pgTable(
  "jarvis_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => jarvisAgentRuns.id, { onDelete: "cascade" }),
    stepIndex: integer("step_index").notNull(),
    toolName: text("tool_name").notNull(),
    argsHash: text("args_hash").notNull(),
    riskTier: text("risk_tier").notNull(),
    resultSummary: text("result_summary").notNull(),
    simulated: boolean("simulated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("jarvis_audit_log_run_id_idx").on(t.runId),
    index("jarvis_audit_log_tool_name_idx").on(t.toolName),
    index("jarvis_audit_log_created_at_idx").on(t.createdAt),
  ],
);
