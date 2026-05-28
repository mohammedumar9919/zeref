import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { platformAccounts } from "./platform-accounts.js";

/** Immutable collected raw payload (C6). */
export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    platformAccountId: uuid("platform_account_id").references(() => platformAccounts.id, {
      onDelete: "set null",
    }),
    platform: text("platform").notNull(),
    kind: text("kind").notNull(),
    sourceRef: text("source_ref").notNull(),
    contentHash: text("content_hash").notNull(),
    payloadJson: jsonb("payload_json").$type<unknown>().notNull(),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("snapshots_platform_account_id_idx").on(t.platformAccountId),
    index("snapshots_platform_kind_idx").on(t.platform, t.kind),
    index("snapshots_content_hash_idx").on(t.contentHash),
  ],
);
