CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "metric_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"normalized_entity_id" uuid NOT NULL,
	"platform_account_id" uuid NOT NULL,
	"metric_version" text NOT NULL,
	"engagement_score" numeric(12, 6),
	"niche_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"insufficient_data" boolean DEFAULT false NOT NULL,
	"facts_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "metric_facts" ADD CONSTRAINT "metric_facts_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "metric_facts" ADD CONSTRAINT "metric_facts_normalized_entity_id_normalized_entities_id_fk" FOREIGN KEY ("normalized_entity_id") REFERENCES "public"."normalized_entities"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "metric_facts" ADD CONSTRAINT "metric_facts_platform_account_id_platform_accounts_id_fk" FOREIGN KEY ("platform_account_id") REFERENCES "public"."platform_accounts"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "metric_facts_snapshot_id_idx" ON "metric_facts" USING btree ("snapshot_id");
--> statement-breakpoint
CREATE INDEX "metric_facts_normalized_entity_id_idx" ON "metric_facts" USING btree ("normalized_entity_id");
--> statement-breakpoint
CREATE INDEX "metric_facts_platform_account_id_idx" ON "metric_facts" USING btree ("platform_account_id");
--> statement-breakpoint
CREATE INDEX "metric_facts_metric_version_idx" ON "metric_facts" USING btree ("metric_version");
--> statement-breakpoint
CREATE TABLE "embedding_vectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"normalized_entity_id" uuid NOT NULL,
	"model" text NOT NULL,
	"dimensions" integer NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "embedding_vectors_dimensions_chk" CHECK (dimensions = 1536)
);
--> statement-breakpoint
ALTER TABLE "embedding_vectors" ADD CONSTRAINT "embedding_vectors_normalized_entity_id_normalized_entities_id_fk" FOREIGN KEY ("normalized_entity_id") REFERENCES "public"."normalized_entities"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "embedding_vectors_entity_model_uq" ON "embedding_vectors" USING btree ("normalized_entity_id","model");
--> statement-breakpoint
CREATE INDEX "embedding_vectors_content_hash_idx" ON "embedding_vectors" USING btree ("content_hash");
--> statement-breakpoint
CREATE TRIGGER metric_facts_append_only
  BEFORE UPDATE OR DELETE ON metric_facts
  FOR EACH ROW
  EXECUTE FUNCTION zeref_enforce_append_only();
--> statement-breakpoint
CREATE TRIGGER embedding_vectors_append_only
  BEFORE UPDATE OR DELETE ON embedding_vectors
  FOR EACH ROW
  EXECUTE FUNCTION zeref_enforce_append_only();
