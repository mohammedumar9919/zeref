import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const EXPECTED_ROOT_FIXTURES = [
  "normalize-job-input.valid.json",
  "normalize-job-input.invalid.json",
  "normalize-job-output.valid.json",
  "normalize-job-output.insufficient-data.valid.json",
  "embed-job-input.valid.json",
  "embed-job-input.invalid.json",
  "embed-job-output.valid.json",
  "normalized-post-payload.valid.json",
  "normalized-post-payload.invalid.json",
  "metric-facts-payload.valid.json",
  "metric-facts-payload.invalid.json",
];

const EXPECTED_METRIC_FIXTURES = [
  "rich-night-ride.json",
  "ride-log.json",
  "edits-reel.json",
  "zero-engagement.json",
  "insufficient-thin.json",
];

const EXPECTED_RETRIEVAL_FIXTURES = [
  "corpus.json",
  "queries/q-ride-log-cluster.json",
  "queries/q-night-ride-cluster.json",
];

/** Normalize/embed modules that must not import @zeref/instagram (C14 / ADR-009). */
const C14_GUARD_PATHS = [
  "apps/worker/src/jobs/normalize.ts",
  "apps/worker/src/jobs/embed.ts",
  "apps/worker/src/lib/normalize-payload.ts",
  "apps/worker/src/lib/embed-text.ts",
  "apps/worker/src/lib/embed-provider.ts",
  "apps/worker/src/lib/auto-embed.ts",
];

/** Phase 3 minimum registry (C12); C22 allows additional jobs after Phase 4. */
const REQUIRED_PHASE3_JOBS = ["collect", "normalize", "embed"];

function fail(message) {
  console.error(`[verify:phase-3] ${message}`);
  process.exitCode = 1;
}

function assertExists(relPath, label = relPath) {
  const abs = join(repoRoot, relPath);
  if (!existsSync(abs)) fail(`Missing ${label}: ${relPath}`);
}

function ciSafeEnv() {
  const env = { ...process.env };
  delete env.ZEREF_LIVE_INSTAGRAM;
  delete env.ZEREF_EMBED_PROVIDER;
  delete env.ZEREF_NOMIC_EMBED_URL;
  delete env.OPENAI_API_KEY;
  env.ZEREF_EMBED_PROVIDER = "mock";
  return env;
}

function run(cmd, args, env = ciSafeEnv()) {
  const res = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (res.status !== 0) fail(`Command failed: ${cmd} ${args.join(" ")}`);
}

function assertNoInstagramInNormalizeEmbedPaths() {
  const importPattern =
    /(?:from\s+["']@zeref\/instagram["']|import\s*\(\s*["']@zeref\/instagram["']|require\s*\(\s*["']@zeref\/instagram["'])/;
  for (const relPath of C14_GUARD_PATHS) {
    assertExists(relPath, `C14 guard path ${relPath}`);
    const source = readFileSync(join(repoRoot, relPath), "utf8");
    if (importPattern.test(source)) {
      fail(`C14: ${relPath} must not import @zeref/instagram`);
    }
  }
}

function assertPhase3MigrationLockedDimensions() {
  const migrationRel = "packages/db/drizzle/0001_phase3_analytics_embeddings.sql";
  assertExists(migrationRel, "Phase 3 migration SQL");
  const sql = readFileSync(join(repoRoot, migrationRel), "utf8");
  if (!/CREATE EXTENSION IF NOT EXISTS vector/i.test(sql)) {
    fail("Phase 3 migration must enable pgvector extension");
  }
  if (!/vector\(1536\)/i.test(sql)) {
    fail("Phase 3 migration must lock embedding column to vector(1536) (C16)");
  }
}

function assertMetricGoldenFixturesPresent() {
  const metricsDir = join(repoRoot, "fixtures/phase-3/metrics");
  assertExists("fixtures/phase-3/metrics", "metrics fixtures directory");
  const onDisk = readdirSync(metricsDir).filter((name) => name.endsWith(".json"));
  for (const fixture of EXPECTED_METRIC_FIXTURES) {
    if (!onDisk.includes(fixture)) {
      fail(`Missing metric golden fixture: fixtures/phase-3/metrics/${fixture}`);
    }
  }
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

if (
  process.env.ZEREF_EMBED_PROVIDER &&
  process.env.ZEREF_EMBED_PROVIDER !== "mock"
) {
  console.warn(
    "[verify:phase-3] ZEREF_EMBED_PROVIDER is set; default verify path forces mock provider (ADR-010).",
  );
}

assertExists("docs/governance/phase-3-contract.md", "Phase 3 contract");

for (const adr of [
  "docs/governance/adr/ADR-007-embedding-provider.md",
  "docs/governance/adr/ADR-008-normalize-embed-chain.md",
  "docs/governance/adr/ADR-009-worker-normalize-boundaries.md",
  "docs/governance/adr/ADR-010-verify-phase-3-harness.md",
]) {
  assertExists(adr);
}

assertExists("packages/analytics/package.json", "@zeref/analytics");
assertExists("scripts/enqueue-normalize.mjs", "enqueue-normalize CLI");
assertExists("scripts/enqueue-embed.mjs", "enqueue-embed CLI");

for (const fixture of EXPECTED_ROOT_FIXTURES) {
  assertExists(`fixtures/phase-3/${fixture}`, `fixture ${fixture}`);
}

assertMetricGoldenFixturesPresent();

for (const fixture of EXPECTED_RETRIEVAL_FIXTURES) {
  assertExists(`fixtures/phase-3/retrieval/${fixture}`, `retrieval fixture ${fixture}`);
}

assertNoInstagramInNormalizeEmbedPaths();
assertPhase3MigrationLockedDimensions();

run("npm", ["run", "build"]);

assertExists("packages/contracts/dist/index.js", "contracts build output");
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
if (typeof contracts.PHASE3_CONTRACT_VERSION !== "string") {
  fail("PHASE3_CONTRACT_VERSION export missing (C11)");
}
for (const exportName of [
  "NormalizeJobOutputSchema",
  "EmbedJobInputSchema",
  "EmbedJobOutputSchema",
]) {
  if (typeof contracts[exportName]?.parse !== "function") {
    fail(`${exportName} export missing (C11)`);
  }
}

assertExists("apps/worker/dist/index.js", "worker build output");
const worker = await import(
  pathToFileURL(join(repoRoot, "apps/worker/dist/index.js")).href
);
if (!Array.isArray(worker.WORKER_JOB_NAMES)) {
  fail("WORKER_JOB_NAMES must be an array (C12)");
}
for (const job of REQUIRED_PHASE3_JOBS) {
  if (!worker.WORKER_JOB_NAMES.includes(job)) {
    fail(`WORKER_JOB_NAMES missing ${job} (C12 / C22)`);
  }
}

run("npm", ["-w", "@zeref/contracts", "test"]);
run("npm", ["-w", "@zeref/analytics", "test"]);
run("npm", ["-w", "@zeref/db", "test"]);
run("npm", ["-w", "@zeref/worker", "test"]);

if (!process.exitCode) {
  console.log("[verify:phase-3] OK");
}
