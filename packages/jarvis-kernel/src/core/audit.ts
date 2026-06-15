import { createHash } from "node:crypto";
import type { RiskTier } from "./permissions.js";

/** In-memory audit entry (C148). Persisted in P11-C via jarvis_audit_log. */
export type JarvisAuditEntry = {
  runId: string;
  stepIndex: number;
  toolName: string;
  argsHash: string;
  riskTier: RiskTier;
  resultSummary: string;
  ts: string;
  simulated: boolean;
};

export type AuditBuffer = {
  readonly entries: readonly JarvisAuditEntry[];
  append(entry: JarvisAuditEntry): void;
};

export function hashArgs(args: Record<string, unknown>): string {
  const normalized = JSON.stringify(args, Object.keys(args).sort());
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export function summarizeAuditResult(data: unknown, error?: string): string {
  if (error) return `error: ${error.slice(0, 120)}`;
  if (data === undefined || data === null) return "ok";
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return text.slice(0, 200);
}

export function createAuditBuffer(): AuditBuffer {
  const entries: JarvisAuditEntry[] = [];
  return {
    get entries() {
      return entries;
    },
    append(entry: JarvisAuditEntry) {
      entries.push(entry);
    },
  };
}
