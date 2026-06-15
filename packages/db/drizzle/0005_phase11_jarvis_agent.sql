CREATE TABLE "jarvis_agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"turn_id" uuid NOT NULL,
	"transcript_summary" text DEFAULT '' NOT NULL,
	"iteration_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "jarvis_agent_runs_turn_id_idx" ON "jarvis_agent_runs" USING btree ("turn_id");
--> statement-breakpoint
CREATE INDEX "jarvis_agent_runs_status_idx" ON "jarvis_agent_runs" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "jarvis_agent_runs_started_at_idx" ON "jarvis_agent_runs" USING btree ("started_at");
--> statement-breakpoint
CREATE TABLE "jarvis_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_index" integer NOT NULL,
	"tool_name" text NOT NULL,
	"args_hash" text NOT NULL,
	"risk_tier" text NOT NULL,
	"result_summary" text NOT NULL,
	"simulated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jarvis_audit_log" ADD CONSTRAINT "jarvis_audit_log_run_id_jarvis_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."jarvis_agent_runs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "jarvis_audit_log_run_id_idx" ON "jarvis_audit_log" USING btree ("run_id");
--> statement-breakpoint
CREATE INDEX "jarvis_audit_log_tool_name_idx" ON "jarvis_audit_log" USING btree ("tool_name");
--> statement-breakpoint
CREATE INDEX "jarvis_audit_log_created_at_idx" ON "jarvis_audit_log" USING btree ("created_at");
