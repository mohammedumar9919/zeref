import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
  /** Active Jarvis version pack name (CLOUD-C7). Label only — never drives tiers. */
  readonly packVersion?: string;
};

export type AuditBuffer = {
  readonly entries: readonly JarvisAuditEntry[];
  readonly packVersion: string;
  append(entry: JarvisAuditEntry): void;
};

export const UNVERSIONED_PACK = "unversioned";

const PACK_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function findJarvisConfigDir(start: string): string | undefined {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "config", "jarvis");
    if (existsSync(join(candidate, "active.json"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}

/**
 * Read-only lookup of the active pack name: `ZEREF_JARVIS_PACK`, else
 * `config/jarvis/active.json` found by walking up from cwd. Never throws.
 */
export function resolveActivePackVersion(
  opts: { env?: NodeJS.ProcessEnv; configDir?: string } = {},
): string {
  const env = opts.env ?? process.env;
  const override = env.ZEREF_JARVIS_PACK?.trim();
  if (override && PACK_NAME.test(override)) return override;
  try {
    const configDir = opts.configDir ?? findJarvisConfigDir(process.cwd());
    if (!configDir) return UNVERSIONED_PACK;
    const active = JSON.parse(readFileSync(join(configDir, "active.json"), "utf8")) as { pack?: unknown };
    return typeof active.pack === "string" && PACK_NAME.test(active.pack) ? active.pack : UNVERSIONED_PACK;
  } catch {
    return UNVERSIONED_PACK;
  }
}

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

export function createAuditBuffer(opts: { packVersion?: string } = {}): AuditBuffer {
  const entries: JarvisAuditEntry[] = [];
  const packVersion = opts.packVersion ?? resolveActivePackVersion();
  return {
    get entries() {
      return entries;
    },
    packVersion,
    append(entry: JarvisAuditEntry) {
      entries.push({ ...entry, packVersion: entry.packVersion ?? packVersion });
    },
  };
}
