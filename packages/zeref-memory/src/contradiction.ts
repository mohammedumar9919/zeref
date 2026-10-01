import type { MemoryEntry } from "@zeref/contracts";

import {
  semanticContradictionCheck,
  type SuspectedContradiction,
} from "./semantic-contradiction.js";

export type ContradictionMatch = {
  supersededId: string;
  entryId: string;
};

/** Rule-based contradiction: same entity_id + valueKey + different value (Q4). */
export function ruleBasedContradictionCheck(
  candidate: Pick<MemoryEntry, "entityId" | "valueKey" | "value" | "id">,
  existing: MemoryEntry[],
): ContradictionMatch[] {
  if (!candidate.entityId || !candidate.valueKey || candidate.value == null) {
    return [];
  }

  const matches: ContradictionMatch[] = [];

  for (const entry of existing) {
    if (entry.id === candidate.id) {
      continue;
    }
    if (entry.observation === "contradicted") {
      continue;
    }
    if (entry.entityId !== candidate.entityId) {
      continue;
    }
    if (entry.valueKey !== candidate.valueKey) {
      continue;
    }
    if (entry.value === candidate.value) {
      continue;
    }

    matches.push({
      supersededId: entry.id,
      entryId: candidate.id ?? "pending",
    });
  }

  return matches;
}

export type ContradictionCheckResult = {
  exact: ContradictionMatch[];
  suspected: SuspectedContradiction[];
};

/** Exact rule (marks contradicted) plus semantic suspects (flag only), deduped against exact. */
export function checkContradictions(
  candidate: Pick<MemoryEntry, "entityId" | "valueKey" | "value" | "id" | "content">,
  existing: MemoryEntry[],
): ContradictionCheckResult {
  const exact = ruleBasedContradictionCheck(candidate, existing);
  const exactIds = new Set(exact.map((m) => m.supersededId));
  const suspected = semanticContradictionCheck(candidate, existing).filter(
    (s) => !exactIds.has(s.suspectedOfId),
  );
  return { exact, suspected };
}

export function suspectedMetadata(
  metadata: Record<string, unknown>,
  suspected: SuspectedContradiction[],
): Record<string, unknown> {
  if (suspected.length === 0) return metadata;
  return {
    ...metadata,
    suspectedContradictionOf: suspected.map((s) => ({ id: s.suspectedOfId, reason: s.reason })),
  };
}
