import type { MemoryEntry, VaultForgetResult, VaultItem, VaultKind } from "@zeref/contracts";

export type MemorySearchResult = {
  id: string;
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

/** Memory adapter port (C144) — implemented in src/zeref/ for Zeref I/O. */
export type MemoryPort = {
  search(query: string, opts?: { limit?: number }): Promise<MemorySearchResult[]>;
  save(content: string, opts?: { tags?: string[] }): Promise<{ id: string }>;
};

/** Memory vault port (CLOUD-C3). Forget must only ever delete vault items. */
export type VaultPort = {
  saveVaultItem(input: {
    kind: VaultKind;
    content: string;
    sourceTurnId?: string | null;
    entityId?: string | null;
  }): Promise<VaultItem>;
  listVaultItems(opts?: { kind?: VaultKind; limit?: number }): Promise<VaultItem[]>;
  forgetVaultItem(id: string): Promise<VaultForgetResult>;
};

/** A memory entry with its lifecycle links (C19a `MemoryLifecycleEntry`). */
export type MemoryHistoryEntry = MemoryEntry & {
  supersededBy: string | null;
  archivedAt: string | null;
};

/** Memory lifecycle port (CLOUD-C19b). No method on this port ever deletes. */
export type MemoryLifecyclePort = {
  /** Lexical/hybrid search; hides contradicted (superseded) and archived entries. */
  searchEntries(query: string, opts?: { limit?: number }): Promise<MemoryEntry[]>;
  /** Current items only unless `includeHistory` (superseded + archived too). */
  listVaultItems(opts?: {
    kind?: VaultKind;
    limit?: number;
    includeHistory?: boolean;
  }): Promise<VaultItem[]>;
  /** Whole supersede chain containing `id`, oldest → newest; `[]` for unknown ids. */
  getEntryHistory(id: string): Promise<MemoryHistoryEntry[]>;
  proposeStaleArchive(opts?: { olderThanDays?: number; limit?: number }): Promise<MemoryEntry[]>;
  supersedeEntry(
    oldId: string,
    input: { content: string },
  ): Promise<{ entry: MemoryEntry; supersededId: string }>;
  archiveEntries(
    ids: string[],
  ): Promise<{ archived: string[]; alreadyArchived: string[]; notFound: string[] }>;
};
