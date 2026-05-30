import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function fail(message) {
  console.error(`[verify:phase-0] ${message}`);
  process.exitCode = 1;
}

function assertExists(relPath, label = relPath) {
  const abs = join(repoRoot, relPath);
  if (!existsSync(abs)) fail(`Missing ${label}: ${relPath}`);
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) fail(`Command failed: ${cmd} ${args.join(" ")}`);
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

run("npm", ["run", "build"]);

for (const p of [
  "apps/web",
  "apps/api",
  "apps/worker",
  "apps/whisper",
  "packages/contracts",
  "packages/db",
  "packages/domain",
  "docs/governance/phase-0-contract.md",
  "docs/governance/phase-5.0.1-contract.md",
  "scripts/worker.mjs",
  "scripts/run-pipeline.mjs",
  "scripts/phase_gate.ps1",
  ".env.example",
  "docker-compose.yml",
  "AGENTS.md",
  "docs/CURRENT_STATE.md",
]) {
  assertExists(p);
}

assertExists("packages/contracts/dist/index.js", "contracts build output");
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
if (typeof contracts.PHASE0_CONTRACT_VERSION !== "string") {
  fail("PHASE0_CONTRACT_VERSION export missing");
}

run("npm", ["-w", "@zeref/contracts", "test"]);

if (!process.exitCode) {
  console.log("[verify:phase-0] OK");
}