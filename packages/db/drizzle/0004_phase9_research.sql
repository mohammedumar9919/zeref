CREATE TABLE "research_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"scope_entity_id" uuid,
	"trend_score" numeric(12, 6),
	"signal_count" integer DEFAULT 0 NOT NULL,
	"last_computed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_topics" ADD CONSTRAINT "research_topics_scope_entity_id_normalized_entities_id_fk" FOREIGN KEY ("scope_entity_id") REFERENCES "public"."normalized_entities"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "research_topics_scope_entity_id_idx" ON "research_topics" USING btree ("scope_entity_id");
--> statement-breakpoint
CREATE INDEX "research_topics_last_computed_at_idx" ON "research_topics" USING btree ("last_computed_at");
--> statement-breakpoint
CREATE TABLE "research_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"source_entity_id" uuid,
	"source_snapshot_id" uuid,
	"signal_type" text NOT NULL,
	"score" numeric(12, 6) NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"computed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_signals" ADD CONSTRAINT "research_signals_topic_id_research_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."research_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "research_signals" ADD CONSTRAINT "research_signals_source_entity_id_normalized_entities_id_fk" FOREIGN KEY ("source_entity_id") REFERENCES "public"."normalized_entities"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "research_signals" ADD CONSTRAINT "research_signals_source_snapshot_id_snapshots_id_fk" FOREIGN KEY ("source_snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "research_signals_topic_id_idx" ON "research_signals" USING btree ("topic_id");
--> statement-breakpoint
CREATE INDEX "research_signals_computed_at_idx" ON "research_signals" USING btree ("computed_at");
--> statement-breakpoint
CREATE INDEX "research_signals_signal_type_idx" ON "research_signals" USING btree ("signal_type");
