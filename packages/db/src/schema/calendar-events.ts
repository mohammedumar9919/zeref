import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Scheduled calendar events (ADR-029). */
export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    jobType: text("job_type"),
    payloadJson: jsonb("payload_json")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("calendar_events_scheduled_at_idx").on(t.scheduledAt),
    index("calendar_events_status_idx").on(t.status),
    index("calendar_events_job_type_idx").on(t.jobType),
  ],
);
