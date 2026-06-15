import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Agentic JARVIS run records (ADR-040, C152). */
export const jarvisAgentRuns = pgTable(
  "jarvis_agent_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    turnId: uuid("turn_id").notNull(),
    transcriptSummary: text("transcript_summary").notNull().default(""),
    iterationCount: integer("iteration_count").notNull().default(0),
  },
  (t) => [
    index("jarvis_agent_runs_turn_id_idx").on(t.turnId),
    index("jarvis_agent_runs_status_idx").on(t.status),
    index("jarvis_agent_runs_started_at_idx").on(t.startedAt),
  ],
);
