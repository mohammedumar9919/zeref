#!/usr/bin/env node
/**
 * Long-running pg-boss worker daemon — consumes collect/normalize/embed/analyze/report.
 *
 * Usage:
 *   npm run build && npm run dev:worker
 *   DATABASE_URL=postgres://zeref:zeref@localhost:5432/zeref node scripts/worker.mjs
 */
import pg from "pg";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const connectionString =
  process.env.DATABASE_URL ?? "postgres://zeref:zeref@localhost:5432/zeref";

const workerEntry = pathToFileURL(
  join(repoRoot, "apps/worker/dist/index.js"),
).href;

const { startWorker } = await import(workerEntry);

const pool = new pg.Pool({ connectionString, max: 10 });

console.log(`[worker] starting pg-boss @ ${connectionString.replace(/:[^:@/]+@/, ":***@")}`);

const boss = await startWorker({ connectionString, pool, repoRoot });

console.log("[worker] listening: collect, normalize, embed, analyze, report");
console.log("[worker] enqueue via scripts/enqueue-*.mjs — Ctrl+C to stop");

async function shutdown(signal) {
  console.log(`[worker] ${signal} — stopping`);
  await boss.stop({ graceful: true, timeout: 10000 });
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
