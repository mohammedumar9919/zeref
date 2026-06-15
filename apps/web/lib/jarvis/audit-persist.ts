import { randomUUID } from "node:crypto";

import type { AgentRunStatus, JarvisAuditEntry } from "@zeref/contracts";
import { jarvisAgentRuns, jarvisAuditLog } from "@zeref/db";
import type { AuditBuffer } from "@zeref/jarvis-kernel";

import { getDb, isFixtureMode } from "../db";

function skipPersist(): boolean {
  return (
    isFixtureMode() ||
    process.env.SKIP_DB_TESTS === "1" ||
    process.env.ZEREF_BFF_FIXTURE === "1" ||
    !getDb()
  );
}

function mapTerminalStatus(
  reason: string,
): AgentRunStatus {
  switch (reason) {
    case "awaiting_confirm":
      return "awaiting_confirm";
    case "budget_exhausted":
      return "budget_exhausted";
    case "killed":
      return "killed";
    default:
      return "completed";
  }
}

/** Persist audit buffer to jarvis_audit_log + jarvis_agent_runs (C156). */
export async function persistAgentAudit(input: {
  runId: string;
  turnId: string;
  transcript: string;
  terminalReason: string;
  audit: AuditBuffer;
  iterationCount: number;
  startedAt: string;
  endedAt: string;
}): Promise<void> {
  if (skipPersist()) {
    return;
  }

  const db = getDb();
  if (!db) {
    return;
  }

  const status = mapTerminalStatus(input.terminalReason);
  const transcriptSummary = input.transcript.slice(0, 500);

  await db.insert(jarvisAgentRuns).values({
    id: input.runId,
    status,
    startedAt: new Date(input.startedAt),
    endedAt: new Date(input.endedAt),
    turnId: input.turnId,
    transcriptSummary,
    iterationCount: input.iterationCount,
  });

  if (input.audit.entries.length === 0) {
    return;
  }

  const rows = input.audit.entries.map((entry) => ({
    id: randomUUID(),
    runId: input.runId,
    stepIndex: entry.stepIndex,
    toolName: entry.toolName,
    argsHash: entry.argsHash,
    riskTier: entry.riskTier,
    resultSummary: entry.resultSummary,
    simulated: entry.simulated,
    createdAt: new Date(entry.ts),
  }));

  await db.insert(jarvisAuditLog).values(rows);
}

export function auditEntryToContract(
  entry: AuditBuffer["entries"][number],
): Omit<JarvisAuditEntry, "id"> {
  return {
    runId: entry.runId,
    stepIndex: entry.stepIndex,
    toolName: entry.toolName as JarvisAuditEntry["toolName"],
    argsHash: entry.argsHash,
    riskTier: entry.riskTier,
    resultSummary: entry.resultSummary,
    simulated: entry.simulated,
    createdAt: entry.ts,
  };
}
