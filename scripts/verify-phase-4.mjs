import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const EXPECTED_PHASE4_FIXTURES = [
  "analyze-job-input.valid.json",
  "analyze-job-output.valid.json",
  "report-job-input.valid.json",
  "report-job-output.valid.json",
];

const EXPECTED_ELITE_GOLDENS = ["ride-log-elite.golden.json"];

const EXPECTED_WORKER_JOBS = [
  "collect",
  "normalize",
  "embed",
  "analyze",
  "report",
  "research",
];

/** Paths that must not import @zeref/instagram (C19). */
const C19_GUARD_PATHS = [
  "apps/worker/src/jobs/analyze.ts",
  "apps/worker/src/jobs/report.ts",
  "packages/reports/src/elite/build.ts",
  "packages/reports/src/citations.ts",
  "packages/reports/src/narrative.ts",
  "packages/reports/src/cohort.ts",
];

function fail(message) {
  console.error(`[verify:phase-4] ${message}`);
  process.exitCode = 1;
}

function assertExists(relPath, label = relPath) {
  if (!existsSync(join(repoRoot, relPath))) fail(`Missing ${label}: ${relPath}`);
}

function llmSafeEnv() {
  const env = { ...process.env };
  delete env.OPENROUTER_API_KEY;
  env.ZEREF_LLM_MOCK = "1";
  env.ZEREF_EMBED_PROVIDER = "mock";
  return env;
}

function run(cmd, args, env = llmSafeEnv()) {
  const res = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (res.status !== 0) fail(`Command failed: ${cmd} ${args.join(" ")}`);
}

function assertNoInstagramInPaths() {
  const importPattern =
    /(?:from\s+["']@zeref\/instagram["']|import\s*\(\s*["']@zeref\/instagram["']|require\s*\(\s*["']@zeref\/instagram["'])/;
  for (const relPath of C19_GUARD_PATHS) {
    assertExists(relPath, `C19 guard ${relPath}`);
    const source = readFileSync(join(repoRoot, relPath), "utf8");
    if (importPattern.test(source)) {
      fail(`C19: ${relPath} must not import @zeref/instagram`);
    }
  }
}

function assertEliteGoldenPresent() {
  const eliteDir = join(repoRoot, "fixtures/phase-4/elite");
  assertExists("fixtures/phase-4/elite", "elite fixtures directory");
  const onDisk = readdirSync(eliteDir).filter((n) => n.endsWith(".json"));
  for (const name of EXPECTED_ELITE_GOLDENS) {
    if (!onDisk.includes(name)) fail(`Missing elite golden: fixtures/phase-4/elite/${name}`);
  }
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

assertExists("docs/governance/phase-4-contract.md", "Phase 4 contract");

for (const adr of [
  "docs/governance/adr/ADR-011-openrouter-mock.md",
  "docs/governance/adr/ADR-012-analyze-report-chain.md",
  "docs/governance/adr/ADR-013-analyze-report-boundaries.md",
  "docs/governance/adr/ADR-014-verify-phase-4.md",
]) {
  assertExists(adr);
}

assertExists("packages/reports/package.json", "@zeref/reports");
assertExists("scripts/enqueue-analyze.mjs", "enqueue-analyze CLI");
assertExists("scripts/enqueue-report.mjs", "enqueue-report CLI");

for (const fixture of EXPECTED_PHASE4_FIXTURES) {
  assertExists(`fixtures/phase-4/${fixture}`, `fixture ${fixture}`);
}
assertEliteGoldenPresent();
assertNoInstagramInPaths();

run("npm", ["run", "build"]);

const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
if (contracts.PHASE4_CONTRACT_VERSION !== "4.0.0") {
  fail("PHASE4_CONTRACT_VERSION must be 4.0.0 (C17)");
}
for (const exportName of [
  "AnalyzeJobOutputSchema",
  "ReportJobOutputSchema",
  "EliteReportSchema",
]) {
  if (typeof contracts[exportName]?.parse !== "function") {
    fail(`${exportName} export missing (C17)`);
  }
}

const worker = await import(
  pathToFileURL(join(repoRoot, "apps/worker/dist/index.js")).href
);
if (!Array.isArray(worker.WORKER_JOB_NAMES)) {
  fail("WORKER_JOB_NAMES must be an array (C18)");
}
if (worker.WORKER_JOB_NAMES.length !== EXPECTED_WORKER_JOBS.length) {
  fail(
    `WORKER_JOB_NAMES must be exactly ${EXPECTED_WORKER_JOBS.join(", ")} (C18), got: ${worker.WORKER_JOB_NAMES.join(", ")}`,
  );
}
for (const job of EXPECTED_WORKER_JOBS) {
  if (!worker.WORKER_JOB_NAMES.includes(job)) {
    fail(`WORKER_JOB_NAMES missing ${job} (C18)`);
  }
}

run("npm", ["-w", "@zeref/contracts", "test"]);
run("npm", ["-w", "@zeref/reports", "test"]);
run("npm", ["-w", "@zeref/db", "test"]);
run("npm", ["-w", "@zeref/worker", "test"]);

if (!process.exitCode) {
  console.log("[verify:phase-4] OK");
}
