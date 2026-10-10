#!/usr/bin/env node
/**
 * Jarvis version-pack promotion (CLOUD-C7). Human-only.
 *
 *   node scripts/jarvis-promote.mjs --candidate <name> --dry-run   # verdict only, writes nothing
 *   node scripts/jarvis-promote.mjs --candidate <name> --approve   # laptop TTY, no CI
 *   node scripts/jarvis-promote.mjs --rollback                     # swap active ↔ previous
 */
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { runPromote } from "./lib/jarvis-pack.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const code = await runPromote(process.argv.slice(2), {
  configDir: join(repoRoot, "config/jarvis"),
  repoRoot,
  env: process.env,
  isTTY: Boolean(process.stdin.isTTY),
});
process.exit(code);
