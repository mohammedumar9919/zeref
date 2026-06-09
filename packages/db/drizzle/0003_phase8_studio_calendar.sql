CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"job_type" text,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "calendar_events_scheduled_at_idx" ON "calendar_events" USING btree ("scheduled_at");
--> statement-breakpoint
CREATE INDEX "calendar_events_status_idx" ON "calendar_events" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "calendar_events_job_type_idx" ON "calendar_events" USING btree ("job_type");
--> statement-breakpoint
CREATE TABLE "studio_drafts" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"tags_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio_drafts" ADD CONSTRAINT "studio_drafts_entity_id_normalized_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."normalized_entities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "studio_drafts_updated_at_idx" ON "studio_drafts" USING btree ("updated_at");
