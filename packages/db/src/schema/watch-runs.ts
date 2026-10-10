import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Own-account watch run audit (C18b). Never stores tokens or raw error messages. */
export const watchRuns = pgTable(
  "watch_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trigger: text("trigger").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: text("status").notNull(),
    graphCalls: integer("graph_calls").notNull().default(0),
    maxUsagePct: real("max_usage_pct"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    tokenCheckedAt: timestamp("token_checked_at", { withTimezone: true }),
    errorCode: text("error_code"),
    diffJson: jsonb("diff_json").$type<unknown>(),
  },
  (t) => [
    index("watch_runs_started_at_idx").on(t.startedAt),
    index("watch_runs_status_idx").on(t.status),
    check(
      "watch_runs_trigger_chk",
      sql`${t.trigger} IN ('schedule', 'on_demand', 'task_scheduler')`,
    ),
    check(
      "watch_runs_status_chk",
      sql`${t.status} IN ('running', 'ok', 'throttled', 'skipped_locked', 'skipped_disabled', 'skipped_no_token', 'error')`,
    ),
    check("watch_runs_graph_calls_chk", sql`${t.graphCalls} >= 0`),
  ],
);
