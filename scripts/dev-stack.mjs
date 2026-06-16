#!/usr/bin/env node
/**
 * Start db + worker + web dev server (best-effort; worker/web run as child processes).
 *
 * Usage: npm run dev:stack  (or root `npm run dev` when aliased)
 * Web child receives ZEREF_WORKER_AVAILABLE=1 (Phase 10 — C111).
 * Phase 10.5 (C139): Whisper sidecar when available, else ZEREF_WHISPER_MOCK=1;
 * ZEREF_PHASE8_PRODUCT + ZEREF_PHASE9_RESEARCH enabled for live cockpit slices.
 * Phase 12 (C177): ZEREF_PHASE11_AGENT=1 on web child — agentic JARVIS default ON.
 * Requires: docker compose, npm run build already run once
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const whisperDir = join(repoRoot, "apps/whisper");
const isWin = process.platform === "win32";

function run(cmd, args, label, extraEnv = {}, options = {}) {
  const child = spawn(cmd, args, {
    cwd: options.cwd ?? repoRoot,
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

function whisperSidecarAvailable() {
  if (process.env.ZEREF_WHISPER_MOCK === "1") {
    return false;
  }
  return existsSync(join(whisperDir, "whisper_sidecar", "main.py"));
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

  const webEnv = {
    ZEREF_WORKER_AVAILABLE: "1",
    ZEREF_PHASE8_PRODUCT: "1",
    ZEREF_PHASE9_RESEARCH: "1",
    ZEREF_PHASE11_AGENT: "1",
  };

  let whisper = null;
  if (whisperSidecarAvailable()) {
    console.log("[dev:stack] starting whisper sidecar @ 127.0.0.1:8765");
    whisper = run(
      "python",
      ["-m", "whisper_sidecar.main"],
      "whisper",
      {
        WHISPER_HOST: "127.0.0.1",
        WHISPER_PORT: "8765",
      },
      { cwd: whisperDir },
    );
  } else {
    webEnv.ZEREF_WHISPER_MOCK = "1";
    console.log("[dev:stack] ZEREF_WHISPER_MOCK=1 (whisper sidecar unavailable)");
  }

  console.log("[dev:stack] starting worker + web (Ctrl+C stops all)");
  const worker = run("node", ["scripts/worker.mjs"], "worker");
  const web = run("npm", ["run", "dev", "-w", "@zeref/web"], "web", webEnv);

  const shutdown = () => {
    worker.kill("SIGINT");
    web.kill("SIGINT");
    whisper?.kill("SIGINT");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
});
