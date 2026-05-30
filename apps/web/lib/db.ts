import { schema } from "@zeref/db";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

let pool: pg.Pool | null = null;

export function isFixtureMode(): boolean {
  return process.env.ZEREF_BFF_FIXTURE === "1";
}

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

export function getPool(): pg.Pool | null {
  if (isFixtureMode()) {
    return null;
  }

  const url = getDatabaseUrl();
  if (!url) {
    return null;
  }

  pool ??= new pg.Pool({ connectionString: url });
  return pool;
}

export function getDb(): NodePgDatabase<typeof schema> | null {
  const activePool = getPool();
  if (!activePool) {
    return null;
  }

  return drizzle(activePool, { schema });
}

/** Test hook — clears cached pool between DB integration cases. */
export function resetDbPoolForTests(): void {
  if (pool) {
    void pool.end();
    pool = null;
  }
}
