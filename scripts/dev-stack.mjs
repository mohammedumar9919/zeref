#!/usr/bin/env node
/**
 * Start db + worker + web dev server (best-effort; worker/web run as child processes).
 *
 * Usage: npm run dev:stack  (or root `npm run dev` when aliased)
 * Web child receives ZEREF_WORKER_AVAILABLE=1 (Phase 10 — C111).
 * Requires: docker compose, npm run build already run once
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

function run(cmd, args, label, extraEnv = {}) {
  const child = spawn(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: isWin,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://zeref:zeref@localhost:5432/zeref",
      ...extraEnv,
    },
  });
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[dev:stack] ${label} exited ${code}`);
    }
  });
  return child;
}

console.log("[dev:stack] docker compose up -d db");
const compose = spawn("docker", ["compose", "up", "-d", "db"], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: isWin,
});

compose.on("exit", (code) => {
  if (code !== 0) {
    console.error("[dev:stack] docker compose failed — is Docker running?");
    process.exit(code ?? 1);
  }

  console.log("[dev:stack] starting worker + web (Ctrl+C stops all)");
  const worker = run("node", ["scripts/worker.mjs"], "worker");
  const web = run("npm", ["run", "dev", "-w", "@zeref/web"], "web", {
    ZEREF_WORKER_AVAILABLE: "1",
  });

  const shutdown = () => {
    worker.kill("SIGINT");
    web.kill("SIGINT");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
});
