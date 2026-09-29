import {
  forgetVaultItem,
  isMemoryMockMode,
  listVaultItems,
  saveMemory,
  saveVaultItem,
  searchMemory,
  type MemoryAdapter,
} from "@zeref/zeref-memory";
import type { MemoryPort } from "@zeref/jarvis-kernel";

export type WebMemoryPort = MemoryPort &
  Pick<MemoryAdapter, "saveVaultItem" | "listVaultItems" | "forgetVaultItem">;

/** MemoryPort + vault adapter for web BFF (C144, CLOUD-C3). */
export function createWebMemoryPort(): WebMemoryPort {
  return {
    async search(query, opts) {
      const result = await searchMemory(query);
      const limit = opts?.limit ?? 5;
      return result.results.slice(0, limit).map((item) => ({
        id: item.entry.id,
        content: item.entry.content,
        score: item.score,
        metadata: item.entry.metadata,
      }));
    },
    async save(content, opts) {
      const result = await saveMemory({
        content,
        tier: "episodic",
        source: "voice",
        metadata: {
          ...(opts?.tags ? { tags: opts.tags } : {}),
          ...(isMemoryMockMode() ? { simulated: true } : {}),
        },
      });
      return { id: result.entry.id };
    },
    async saveVaultItem(input) {
      return saveVaultItem({
        ...input,
        metadata: {
          ...(input.metadata ?? {}),
          ...(isMemoryMockMode() ? { simulated: true } : {}),
        },
      });
    },
    async listVaultItems(opts) {
      return listVaultItems(opts);
    },
    async forgetVaultItem(id) {
      return forgetVaultItem(id);
    },
  };
}
