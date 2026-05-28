import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const EXPECTED_FIXTURES = [
  "collect-job.valid.json",
  "collect-job.invalid.json",
  "normalize-job.valid.json",
  "normalize-job.invalid-raw-blob.json",
  "analyze-job.valid.json",
  "analyze-job.insufficient-data.valid.json",
  "analyze-job.invalid-raw-blob.json",
  "report-job.valid.json",
  "report-job.insufficient-data.valid.json",
  "report-job.invalid-raw-blob.json",
];

function fail(message) {
  console.error(`[verify:phase-1] ${message}`);
  process.exitCode = 1;
}

function assertExists(relPath, label = relPath) {
  const abs = join(repoRoot, relPath);
  if (!existsSync(abs)) fail(`Missing ${label}: ${relPath}`);
}

function run(cmd, args, env = process.env) {
  const res = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (res.status !== 0) fail(`Command failed: ${cmd} ${args.join(" ")}`);
}

function assertNoPgvectorInPhase1Migrations() {
  const migrationPath = join(
    repoRoot,
    "packages/db/drizzle/0000_phase1_pipeline.sql",
  );
  const sql = readFileSync(migrationPath, "utf8");
  if (/\bvector\b|pgvector|embedding/i.test(sql)) {
    fail("Phase 1 migrations must not use pgvector or embedding columns (C5)");
  }
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

assertExists("docs/governance/phase-1-contract.md", "Phase 1 contract");

for (const adr of [
  "docs/governance/adr/ADR-001-snapshot-data-model.md",
  "docs/governance/adr/ADR-002-id-branding.md",
  "docs/governance/adr/ADR-003-openapi-from-zod.md",
]) {
  assertExists(adr);
}

assertExists(
  "packages/db/drizzle/0000_phase1_pipeline.sql",
  "Phase 1 migration SQL",
);
assertExists("packages/db/drizzle/meta/_journal.json", "Drizzle journal");

for (const fixture of EXPECTED_FIXTURES) {
  assertExists(`fixtures/phase-1/${fixture}`, `fixture ${fixture}`);
}

assertNoPgvectorInPhase1Migrations();

run("npm", ["run", "build"]);

assertExists("packages/contracts/dist/index.js", "contracts build output");
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
if (typeof contracts.PHASE1_CONTRACT_VERSION !== "string") {
  fail("PHASE1_CONTRACT_VERSION export missing");
}

run("npm", ["-w", "@zeref/contracts", "test"]);
run("npm", ["-w", "@zeref/db", "test"]);

if (!process.exitCode) {
  console.log("[verify:phase-1] OK");
}
