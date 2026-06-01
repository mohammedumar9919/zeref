import type { PipelineEvent } from "@zeref/contracts";
import type { Pool } from "pg";

import type { WorkerJobName } from "../jobs/registry.js";

const STAGE_MESSAGES: Record<WorkerJobName, string> = {
  collect: "Collect job completed",
  normalize: "Normalize job completed",
  embed: "Embed job completed",
  analyze: "Analyze job completed",
  report: "Report job completed",
};

export function buildPipelineOutboxPayload(stage: WorkerJobName): PipelineEvent {
  return {
    type: "pipeline",
    stage,
    message: STAGE_MESSAGES[stage],
    ts: new Date().toISOString(),
    simulated: false,
  };
}

/** INSERT cockpit_sse_outbox on pg-boss job completion (ADR-027 Amendment B). */
export async function insertCockpitPipelineOutbox(
  pool: Pool,
  stage: WorkerJobName,
): Promise<void> {
  const payload = buildPipelineOutboxPayload(stage);
  await pool.query(
    `INSERT INTO cockpit_sse_outbox (event_type, payload_json)
     VALUES ($1, $2::jsonb)`,
    ["pipeline", JSON.stringify(payload)],
  );
}
