import type { MemoryTier } from "@zeref/contracts";
import type { TierClassifierContext } from "./types.js";

const PROCEDURAL_PATTERNS = [
  /verify:phase-\d/i,
  /dev:clean/i,
  /enqueue/i,
  /npm run (verify|migrate|db)/i,
];

const PROJECT_PATTERNS = [
  /snapshot[_\s-]?id/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  /report headline/i,
  /@zeref\/contracts/i,
];

/** Auto-classify memory tier from text + context (Phase 7 contract). */
export function autoTierClassifier(
  text: string,
  context: TierClassifierContext = {},
): MemoryTier {
  if (context.source === "voice" || context.source === "worker") {
    return "episodic";
  }

  if (context.snapshotId || PROJECT_PATTERNS.some((re) => re.test(text))) {
    return "project";
  }

  if (PROCEDURAL_PATTERNS.some((re) => re.test(text))) {
    return "procedural";
  }

  if (context.entityId && !context.snapshotId) {
    return "semantic";
  }

  return "semantic";
}
