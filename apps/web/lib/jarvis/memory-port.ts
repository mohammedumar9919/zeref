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

/** Postgres adapter gets the embedder (hybrid lexical + vector RRF); mock stays lexical. */
async function resolveAdapter(): Promise<MemoryAdapter> {
  const adapter = await getMemoryAdapter();
  if (adapter instanceof PostgresMemoryAdapter) {
    adapter.useEmbedder(embedMemoryText, memoryEmbedModel());
  }
  return adapter;
}

/** MemoryPort + vault adapter for web BFF (C144, CLOUD-C3, CLOUD-C4). */
export function createWebMemoryPort(): WebMemoryPort {
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
