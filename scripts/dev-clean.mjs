#!/usr/bin/env node
/**
 * Remove Next.js caches and stale build artifacts (legacy-ios dev:clean pattern).
 * On Windows, also frees port 3000 when a stale next dev process is bound.
 */
import { rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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

if (process.platform === "win32") {
  const ps = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "$p = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($p) { $p | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Write-Host '[dev:clean] freed port 3000' }",
    ],
    { stdio: "inherit", shell: false },
  );
  if (ps.status !== 0) {
    console.log("[dev:clean] port 3000 check skipped (no admin or no listener)");
  }
} else {
  const res = spawnSync("sh", ["-c", "lsof -ti:3000 | xargs -r kill -9"], {
    stdio: "inherit",
  });
  if (res.status === 0) {
    console.log("[dev:clean] freed port 3000");
  }
}

console.log("[dev:clean] OK");
