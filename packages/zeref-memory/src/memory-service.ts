import type { MemoryAdapter } from "./types.js";
import { createMockMemoryAdapter } from "./mock-adapter.js";
import { createPostgresMemoryAdapter } from "./postgres-adapter.js";

let cachedAdapter: MemoryAdapter | null = null;

export function isMemoryMockMode(): boolean {
  return process.env.ZEREF_MEMORY_MOCK === "1";
}

/** Resolve adapter: mock when ZEREF_MEMORY_MOCK=1, else Postgres via DATABASE_URL. */
export async function getMemoryAdapter(): Promise<MemoryAdapter> {
  if (cachedAdapter) {
    return cachedAdapter;
  }

  if (isMemoryMockMode()) {
    cachedAdapter = createMockMemoryAdapter();
    return cachedAdapter;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required when ZEREF_MEMORY_MOCK is not set. Set ZEREF_MEMORY_MOCK=1 for CI.",
    );
  }

  const pg = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { schema } = await import("@zeref/db/schema");

  const pool = new pg.default.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  cachedAdapter = createPostgresMemoryAdapter(db);
  return cachedAdapter;
}

export function resetMemoryAdapterCache(): void {
  cachedAdapter = null;
}

export async function saveMemory(
  ...args: Parameters<MemoryAdapter["saveMemory"]>
) {
  const adapter = await getMemoryAdapter();
  return adapter.saveMemory(...args);
}

export async function searchMemory(
  ...args: Parameters<MemoryAdapter["searchMemory"]>
) {
  const adapter = await getMemoryAdapter();
  return adapter.searchMemory(...args);
}

export async function verifyMemory(
  ...args: Parameters<MemoryAdapter["verifyMemory"]>
) {
  const adapter = await getMemoryAdapter();
  return adapter.verifyMemory(...args);
}

export async function createEntity(
  ...args: Parameters<MemoryAdapter["createEntity"]>
) {
  const adapter = await getMemoryAdapter();
  return adapter.createEntity(...args);
}

export async function updateEntity(
  ...args: Parameters<MemoryAdapter["updateEntity"]>
) {
  const adapter = await getMemoryAdapter();
  return adapter.updateEntity(...args);
}

export async function queryEntities(
  ...args: Parameters<MemoryAdapter["queryEntities"]>
) {
  const adapter = await getMemoryAdapter();
  return adapter.queryEntities(...args);
}

export async function relateEntities(
  ...args: Parameters<MemoryAdapter["relateEntities"]>
) {
  const adapter = await getMemoryAdapter();
  return adapter.relateEntities(...args);
}
