import type { MemoryEntry } from "@zeref/contracts";
import { isVaultEntry } from "./vault.js";
import type {
  MemoryLifecycleEntry,
  ProposeStaleArchiveOptions,
  SupersedeEntryInput,
} from "./types.js";

export const DEFAULT_STALE_DAYS = 90;
export const DEFAULT_STALE_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export type EntryLifecycle = {
  supersededBy: string | null;
  archivedAt: string | null;
};

export function isPinnedVaultEntry(entry: MemoryEntry): boolean {
  return isVaultEntry(entry) && entry.metadata?.kind === "pin";
}

export function staleArchiveWindow(options: ProposeStaleArchiveOptions = {}): {
  cutoff: Date;
  limit: number;
} {
  const days = options.olderThanDays ?? DEFAULT_STALE_DAYS;
  const limit = options.limit ?? DEFAULT_STALE_LIMIT;
  if (!Number.isFinite(days) || days < 0) {
    throw new RangeError(`olderThanDays must be a non-negative number, got ${days}`);
  }
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError(`limit must be a non-negative integer, got ${limit}`);
  }
  const now = options.now ?? new Date();
  return { cutoff: new Date(now.getTime() - days * DAY_MS), limit };
}

/** Stale candidate rule shared by both adapters (the Postgres adapter mirrors it in SQL). */
export function isStaleArchiveCandidate(
  entry: MemoryEntry,
  lifecycle: EntryLifecycle,
  cutoff: Date,
): boolean {
  return (
    lifecycle.archivedAt === null &&
    lifecycle.supersededBy === null &&
    entry.observation !== "contradicted" &&
    !isPinnedVaultEntry(entry) &&
    Date.parse(entry.createdAt) < cutoff.getTime()
  );
}

export function oldestFirst<T extends { createdAt: string; id: string }>(a: T, b: T): number {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id);
}

/** Describe why `old` cannot be superseded, or `null` when it can. */
export function supersedeRefusal(
  oldId: string,
  old: MemoryLifecycleEntry | undefined,
): string | null {
  if (!old) return `Memory entry not found: ${oldId}`;
  if (old.supersededBy) return `Memory entry already superseded: ${oldId}`;
  if (old.archivedAt) return `Memory entry is archived: ${oldId}`;
  return null;
}

/** The replacement inherits tier, source, entity and metadata (e.g. vault kind) from `old`. */
export function supersedeDraft(old: MemoryEntry, input: SupersedeEntryInput) {
  const content = input.content.trim();
  if (!content) {
    throw new Error("supersede content is required");
  }
  const { suspectedContradictionOf: _suspected, ...metadata } = old.metadata ?? {};
  return {
    content,
    tier: old.tier,
    source: old.source,
    entityId: old.entityId,
    valueKey: input.valueKey !== undefined ? input.valueKey : old.valueKey,
    value: input.value ?? null,
    metadata,
  };
}

/**
 * Walk `supersededBy` both ways from `startId`. `successorOf` and `predecessorsOf`
 * expose the links; the walk is bounded by the number of distinct ids it sees.
 */
export function collectChainIds(
  startId: string,
  successorOf: (id: string) => string | null,
  predecessorsOf: (id: string) => string[],
): Set<string> {
  const seen = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const next = [successorOf(id), ...predecessorsOf(id)];
    for (const n of next) {
      if (n && !seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen;
}
