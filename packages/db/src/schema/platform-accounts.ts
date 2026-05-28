import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Stable platform account identity (C1). Phase 1 values: platform = instagram. */
export const platformAccounts = pgTable(
  "platform_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    platform: text("platform").notNull(),
    externalId: text("external_id").notNull(),
    displayName: text("display_name"),
    metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("platform_accounts_platform_external_id_uq").on(t.platform, t.externalId),
    index("platform_accounts_platform_idx").on(t.platform),
  ],
);
