ALTER TABLE "memory_entries" ADD COLUMN "superseded_by" uuid;
--> statement-breakpoint
ALTER TABLE "memory_entries" ADD COLUMN "archived_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_entries_superseded_by_memory_entries_id_fk" FOREIGN KEY ("superseded_by") REFERENCES "public"."memory_entries"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "memory_entries_superseded_by_idx" ON "memory_entries" USING btree ("superseded_by");
--> statement-breakpoint
CREATE INDEX "memory_entries_active_idx" ON "memory_entries" USING btree ("created_at") WHERE "memory_entries"."archived_at" IS NULL;
