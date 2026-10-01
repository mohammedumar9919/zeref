import {
  VaultItemSchema,
  VaultKindSchema,
  type MemoryEntry,
  type VaultItem,
  type VaultKind,
} from "@zeref/contracts";
import type { ListVaultItemsOptions, SaveMemoryInput } from "./types.js";

export const VAULT_SOURCE = "vault" as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type VaultSaveOptions = {
  entityId?: string | null;
  sourceTurnId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

/** Map a vault item onto a plain `saveMemory` input (source=vault, metadata.kind). */
export function toVaultSaveInput(
  kind: VaultKind,
  content: string,
  opts: VaultSaveOptions = {},
): SaveMemoryInput {
  const parsedKind = VaultKindSchema.parse(kind);
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("vault item content is required");
  }
  return {
    content: trimmed,
    tier: "semantic",
    source: VAULT_SOURCE,
    entityId: opts.entityId ?? null,
    metadata: {
      ...(opts.metadata ?? {}),
      kind: parsedKind,
      ...(opts.sourceTurnId ? { sourceTurnId: opts.sourceTurnId } : {}),
    },
    ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
  };
}

export function isVaultEntry(entry: MemoryEntry): boolean {
  return (
    entry.source === VAULT_SOURCE && VaultKindSchema.safeParse(entry.metadata?.kind).success
  );
}

export function toVaultItem(entry: MemoryEntry): VaultItem {
  const sourceTurnId = entry.metadata?.sourceTurnId;
  return VaultItemSchema.parse({
    id: entry.id,
    kind: entry.metadata?.kind,
    content: entry.content,
    entityId: entry.entityId,
    sourceTurnId: typeof sourceTurnId === "string" && sourceTurnId ? sourceTurnId : null,
    createdAt: entry.createdAt,
  });
}

/** Shared list semantics for every adapter: vault rows only, kind filter, newest first, limit. */
export function selectVaultItems(
  entries: MemoryEntry[],
  options: ListVaultItemsOptions = {},
): VaultItem[] {
  const items = entries
    .filter(isVaultEntry)
    .map(toVaultItem)
    .filter((item) => !options.kind || item.kind === options.kind)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return options.limit !== undefined ? items.slice(0, Math.max(0, options.limit)) : items;
}
