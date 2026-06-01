import type { MemoryEntry } from "@zeref/contracts";

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
