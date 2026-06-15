#!/usr/bin/env node
/**
 * JARVIS eval harness entry point (C160).
 * Invoked by scripts/verify-phase-11.mjs under mock env.
 */
process.env.ZEREF_LLM_MOCK = "1";
process.env.ZEREF_BFF_FIXTURE = "1";
process.env.ZEREF_MEMORY_MOCK = "1";
process.env.ZEREF_JOB_ENQUEUE_MOCK = "1";
process.env.ZEREF_PHASE11_AGENT = "1";
delete process.env.OPENROUTER_API_KEY;
delete process.env.DATABASE_URL;

import process from "node:process";
import { runJarvisEval } from "./scorer.mjs";

const { ok, failures } = await runJarvisEval();

if (!ok) {
  console.error(`[jarvis-eval] FAILED: ${failures.join("; ")}`);
  process.exit(1);
}

console.log("[jarvis-eval] OK");
