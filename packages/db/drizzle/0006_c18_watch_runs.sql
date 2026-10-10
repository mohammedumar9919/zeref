CREATE TABLE "watch_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"graph_calls" integer DEFAULT 0 NOT NULL,
	"max_usage_pct" real,
	"token_expires_at" timestamp with time zone,
	"token_checked_at" timestamp with time zone,
	"error_code" text,
	"diff_json" jsonb,
	CONSTRAINT "watch_runs_trigger_chk" CHECK ("trigger" IN ('schedule', 'on_demand', 'task_scheduler')),
	CONSTRAINT "watch_runs_status_chk" CHECK ("status" IN ('running', 'ok', 'throttled', 'skipped_locked', 'skipped_disabled', 'skipped_no_token', 'error')),
	CONSTRAINT "watch_runs_graph_calls_chk" CHECK ("graph_calls" >= 0)
);
--> statement-breakpoint
CREATE INDEX "watch_runs_started_at_idx" ON "watch_runs" USING btree ("started_at");
--> statement-breakpoint
CREATE INDEX "watch_runs_status_idx" ON "watch_runs" USING btree ("status");
