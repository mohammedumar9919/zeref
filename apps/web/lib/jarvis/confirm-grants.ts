import type { ConfirmGrant } from "@zeref/jarvis-kernel";

/** Server-only, in-memory, single-use confirm grants keyed by runId (K1). */

export const CONFIRM_GRANT_TTL_MS = 5 * 60_000;

export const CONFIRM_EXPIRED_REPLY =
  "That confirmation has expired — please ask again.";

type StoredGrant = ConfirmGrant & { createdAt: number };

type GlobalWithGrants = typeof globalThis & {
  __zerefConfirmGrants?: Map<string, StoredGrant>;
};

function store(): Map<string, StoredGrant> {
  const globalRef = globalThis as GlobalWithGrants;
  if (!globalRef.__zerefConfirmGrants) {
    globalRef.__zerefConfirmGrants = new Map();
  }
  return globalRef.__zerefConfirmGrants;
}

function pruneExpired(now: number): void {
  for (const [runId, grant] of store()) {
    if (now - grant.createdAt > CONFIRM_GRANT_TTL_MS) store().delete(runId);
  }
}

/** Record the grant a run is waiting on; replaces any earlier grant for that run. */
export function recordConfirmGrant(
  grant: ConfirmGrant,
  createdAt: number = Date.now(),
): void {
  pruneExpired(Date.now());
  store().set(grant.runId, {
    runId: grant.runId,
    toolName: grant.toolName,
    argsHash: grant.argsHash,
    createdAt,
  });
}

/** Remove and return the grant for runId; undefined if missing, used or expired. */
export function takeConfirmGrant(
  runId: string,
  now: number = Date.now(),
): ConfirmGrant | undefined {
  const stored = store().get(runId);
  store().delete(runId);
  if (!stored || now - stored.createdAt > CONFIRM_GRANT_TTL_MS) return undefined;
  return {
    runId: stored.runId,
    toolName: stored.toolName,
    argsHash: stored.argsHash,
  };
}

export function resetConfirmGrantsForTests(): void {
  store().clear();
}
