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
