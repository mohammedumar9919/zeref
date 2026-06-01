CREATE TABLE "memory_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"state_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"transition_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "memory_entities_type_idx" ON "memory_entities" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "memory_entities_name_idx" ON "memory_entities" USING btree ("name");
--> statement-breakpoint
CREATE TABLE "memory_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier" text NOT NULL,
	"content" text NOT NULL,
	"source" text NOT NULL,
	"entity_id" uuid,
	"value_key" text,
	"value" text,
	"temporal_score" numeric(8, 6) NOT NULL,
	"observation" text DEFAULT 'verified' NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_entries_entity_id_memory_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."memory_entities"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "memory_entries_tier_idx" ON "memory_entries" USING btree ("tier");
--> statement-breakpoint
CREATE INDEX "memory_entries_entity_id_idx" ON "memory_entries" USING btree ("entity_id");
--> statement-breakpoint
CREATE INDEX "memory_entries_observation_idx" ON "memory_entries" USING btree ("observation");
--> statement-breakpoint
CREATE INDEX "memory_entries_created_at_idx" ON "memory_entries" USING btree ("created_at");
--> statement-breakpoint
CREATE TABLE "memory_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_entity_id" uuid NOT NULL,
	"to_entity_id" uuid NOT NULL,
	"relation_type" text NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memory_relations" ADD CONSTRAINT "memory_relations_from_entity_id_memory_entities_id_fk" FOREIGN KEY ("from_entity_id") REFERENCES "public"."memory_entities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memory_relations" ADD CONSTRAINT "memory_relations_to_entity_id_memory_entities_id_fk" FOREIGN KEY ("to_entity_id") REFERENCES "public"."memory_entities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "memory_relations_from_entity_id_idx" ON "memory_relations" USING btree ("from_entity_id");
--> statement-breakpoint
CREATE INDEX "memory_relations_to_entity_id_idx" ON "memory_relations" USING btree ("to_entity_id");
--> statement-breakpoint
CREATE INDEX "memory_relations_relation_type_idx" ON "memory_relations" USING btree ("relation_type");
--> statement-breakpoint
CREATE TABLE "memory_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"superseded_entry_id" uuid,
	"observation_type" text NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memory_observations" ADD CONSTRAINT "memory_observations_entry_id_memory_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."memory_entries"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memory_observations" ADD CONSTRAINT "memory_observations_superseded_entry_id_memory_entries_id_fk" FOREIGN KEY ("superseded_entry_id") REFERENCES "public"."memory_entries"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "memory_observations_entry_id_idx" ON "memory_observations" USING btree ("entry_id");
--> statement-breakpoint
CREATE INDEX "memory_observations_superseded_entry_id_idx" ON "memory_observations" USING btree ("superseded_entry_id");
--> statement-breakpoint
CREATE TABLE "cockpit_sse_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "cockpit_sse_outbox_event_type_idx" ON "cockpit_sse_outbox" USING btree ("event_type");
--> statement-breakpoint
CREATE INDEX "cockpit_sse_outbox_created_at_idx" ON "cockpit_sse_outbox" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "cockpit_sse_outbox_delivered_at_idx" ON "cockpit_sse_outbox" USING btree ("delivered_at");
