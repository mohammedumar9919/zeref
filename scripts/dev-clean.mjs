#!/usr/bin/env node
/**
 * Remove Next.js caches and stale build artifacts (legacy-ios dev:clean pattern).
 */
import { rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const paths = [
  join(repoRoot, "apps/web/.next"),
  join(repoRoot, "apps/web/node_modules/.cache"),
];

for (const p of paths) {
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true });
    console.log(`[dev:clean] removed ${p}`);
  }
}

console.log("[dev:clean] OK");
