import { createHash } from "node:crypto";

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    sorted[key] = sortKeys(record[key]);
  }
  return sorted;
}

/** Canonical sha256 digest for immutable snapshot dedupe (C8). */
export function computeContentHash(payload: unknown): string {
  const canonical = JSON.stringify(sortKeys(payload));
  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
  return `sha256:${digest}`;
}
