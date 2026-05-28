CREATE TABLE "platform_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text,
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_accounts_platform_external_id_uq" ON "platform_accounts" USING btree ("platform","external_id");
--> statement-breakpoint
CREATE INDEX "platform_accounts_platform_idx" ON "platform_accounts" USING btree ("platform");
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_account_id" uuid,
	"platform" text NOT NULL,
	"kind" text NOT NULL,
	"source_ref" text NOT NULL,
	"content_hash" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"collected_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_platform_account_id_platform_accounts_id_fk" FOREIGN KEY ("platform_account_id") REFERENCES "public"."platform_accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "snapshots_platform_account_id_idx" ON "snapshots" USING btree ("platform_account_id");
--> statement-breakpoint
CREATE INDEX "snapshots_platform_kind_idx" ON "snapshots" USING btree ("platform","kind");
--> statement-breakpoint
CREATE INDEX "snapshots_content_hash_idx" ON "snapshots" USING btree ("content_hash");
--> statement-breakpoint
CREATE TABLE "normalized_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"schema_version" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "normalized_entities" ADD CONSTRAINT "normalized_entities_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "normalized_entities_snapshot_id_idx" ON "normalized_entities" USING btree ("snapshot_id");
--> statement-breakpoint
CREATE INDEX "normalized_entities_schema_version_idx" ON "normalized_entities" USING btree ("schema_version");
--> statement-breakpoint
CREATE TABLE "analysis_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"normalized_entity_id" uuid,
	"snapshot_id" uuid,
	"schema_version" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_outputs_lineage_chk" CHECK (
		normalized_entity_id IS NOT NULL OR snapshot_id IS NOT NULL
	)
);
--> statement-breakpoint
ALTER TABLE "analysis_outputs" ADD CONSTRAINT "analysis_outputs_normalized_entity_id_normalized_entities_id_fk" FOREIGN KEY ("normalized_entity_id") REFERENCES "public"."normalized_entities"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "analysis_outputs" ADD CONSTRAINT "analysis_outputs_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "analysis_outputs_normalized_entity_id_idx" ON "analysis_outputs" USING btree ("normalized_entity_id");
--> statement-breakpoint
CREATE INDEX "analysis_outputs_snapshot_id_idx" ON "analysis_outputs" USING btree ("snapshot_id");
--> statement-breakpoint
CREATE INDEX "analysis_outputs_schema_version_idx" ON "analysis_outputs" USING btree ("schema_version");
--> statement-breakpoint
CREATE TABLE "report_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_output_id" uuid,
	"normalized_entity_id" uuid,
	"snapshot_id" uuid,
	"schema_version" text NOT NULL,
	"artifact_kind" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_artifacts_lineage_chk" CHECK (
		analysis_output_id IS NOT NULL
		OR normalized_entity_id IS NOT NULL
		OR snapshot_id IS NOT NULL
	)
);
--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_analysis_output_id_analysis_outputs_id_fk" FOREIGN KEY ("analysis_output_id") REFERENCES "public"."analysis_outputs"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_normalized_entity_id_normalized_entities_id_fk" FOREIGN KEY ("normalized_entity_id") REFERENCES "public"."normalized_entities"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "report_artifacts_analysis_output_id_idx" ON "report_artifacts" USING btree ("analysis_output_id");
--> statement-breakpoint
CREATE INDEX "report_artifacts_normalized_entity_id_idx" ON "report_artifacts" USING btree ("normalized_entity_id");
--> statement-breakpoint
CREATE INDEX "report_artifacts_snapshot_id_idx" ON "report_artifacts" USING btree ("snapshot_id");
--> statement-breakpoint
CREATE INDEX "report_artifacts_artifact_kind_idx" ON "report_artifacts" USING btree ("artifact_kind");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION zeref_enforce_snapshot_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.payload_json IS DISTINCT FROM NEW.payload_json
     OR OLD.content_hash IS DISTINCT FROM NEW.content_hash
     OR OLD.collected_at IS DISTINCT FROM NEW.collected_at THEN
    RAISE EXCEPTION 'snapshots: payload_json, content_hash, and collected_at are immutable (ADR-001 / C6)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER snapshots_immutability
  BEFORE UPDATE ON snapshots
  FOR EACH ROW
  EXECUTE FUNCTION zeref_enforce_snapshot_immutability();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION zeref_enforce_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: UPDATE and DELETE are not allowed (ADR-001)', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER normalized_entities_append_only
  BEFORE UPDATE OR DELETE ON normalized_entities
  FOR EACH ROW
  EXECUTE FUNCTION zeref_enforce_append_only();
--> statement-breakpoint
CREATE TRIGGER analysis_outputs_append_only
  BEFORE UPDATE OR DELETE ON analysis_outputs
  FOR EACH ROW
  EXECUTE FUNCTION zeref_enforce_append_only();
--> statement-breakpoint
CREATE TRIGGER report_artifacts_append_only
  BEFORE UPDATE OR DELETE ON report_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION zeref_enforce_append_only();
