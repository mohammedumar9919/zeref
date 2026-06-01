import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Worker→SSE cross-process outbox (ADR-027 Amendment B). */
export const cockpitSseOutbox = pgTable(
  "cockpit_sse_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    payloadJson: jsonb("payload_json").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (t) => [
    index("cockpit_sse_outbox_event_type_idx").on(t.eventType),
    index("cockpit_sse_outbox_created_at_idx").on(t.createdAt),
    index("cockpit_sse_outbox_delivered_at_idx").on(t.deliveredAt),
  ],
);
