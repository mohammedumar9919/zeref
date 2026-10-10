import { embedText } from "@zeref/analytics";
import { DEFAULT_EMBEDDING_MODEL } from "@zeref/db";
import {
  PostgresMemoryAdapter,
  getMemoryAdapter,
  isMemoryMockMode,
  type MemoryAdapter,
} from "@zeref/zeref-memory";
import type { MemoryPort } from "@zeref/jarvis-kernel";

export type WebMemoryPort = MemoryPort &
  Pick<MemoryAdapter, "saveVaultItem" | "listVaultItems" | "forgetVaultItem">;

/**
 * Model label stored with each memory embedding. The sha256 mock gets its own
 * label so its vectors are never compared with a real provider's.
 */
export function memoryEmbedModel(env: NodeJS.ProcessEnv = process.env): string {
  const provider = env.ZEREF_EMBED_PROVIDER ?? "mock";
  return provider === "mock" ? "mock-sha256" : DEFAULT_EMBEDDING_MODEL;
}

export async function embedMemoryText(text: string): Promise<number[]> {
  const { embedding } = await embedText(text, DEFAULT_EMBEDDING_MODEL);
  return embedding;
}

/**
 * Sha256 mock vectors carry no meaning; fusing them would surface unrelated
 * vault items for queries with no lexical match. Only real providers go hybrid.
 */
export function shouldAttachEmbedder(env: NodeJS.ProcessEnv = process.env): boolean {
  return memoryEmbedModel(env) !== "mock-sha256";
}

/** Postgres adapter + real embed provider → hybrid lexical + vector RRF; otherwise lexical. */
async function resolveAdapter(): Promise<MemoryAdapter> {
  const adapter = await getMemoryAdapter();
  if (adapter instanceof PostgresMemoryAdapter && shouldAttachEmbedder()) {
    adapter.useEmbedder(embedMemoryText, memoryEmbedModel());
  }
  return adapter;
}

/** MemoryPort + vault adapter for web BFF (C144, CLOUD-C3, CLOUD-C4). */
export function createWebMemoryPort(): WebMemoryPort {
  // The kernel's default vault port shares the cached adapter, so attach early.
  void resolveAdapter().catch(() => undefined);
  return {
    async search(query, opts) {
      const limit = opts?.limit ?? 5;
      const result = await (await resolveAdapter()).searchMemory(query, { limit });
      return result.results.slice(0, limit).map((item) => ({
        id: item.entry.id,
        content: item.entry.content,
        score: item.score,
        metadata: item.entry.metadata,
      }));
    },
    async save(content, opts) {
      const result = await (await resolveAdapter()).saveMemory({
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
      return (await resolveAdapter()).saveVaultItem({
        ...input,
        metadata: {
          ...(input.metadata ?? {}),
          ...(isMemoryMockMode() ? { simulated: true } : {}),
        },
      });
    },
    async listVaultItems(opts) {
      return (await resolveAdapter()).listVaultItems(opts);
    },
    async forgetVaultItem(id) {
      return (await resolveAdapter()).forgetVaultItem(id);
    },
  };
}
