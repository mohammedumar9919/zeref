import { isMemoryMockMode, saveMemory, searchMemory } from "@zeref/zeref-memory";
import type { MemoryPort } from "@zeref/jarvis-kernel";

/** MemoryPort adapter for web BFF (C144). */
export function createWebMemoryPort(): MemoryPort {
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
  };
}
