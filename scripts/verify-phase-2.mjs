import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const EXPECTED_ROOT_FIXTURES = [
  "collect-job-input.valid.json",
  "collect-job-input.invalid.json",
  "collect-job-output.valid.json",
  "merged-post.valid.json",
  "merged-post.invalid.json",
];

const EXPECTED_GRAPH_FIXTURES = [
  "user.valid.json",
  "user.invalid.json",
  "media-list.valid.json",
  "media-list.invalid.json",
  "media-single.valid.json",
  "user.json",
  "media-list.json",
];

const EXPECTED_HTML_FIXTURES = [
  "post-hydration-ABC123xyz.html",
  "post-embedded-DEF456uvw.html",
];

function fail(message) {
  console.error(`[verify:phase-2] ${message}`);
  process.exitCode = 1;
}

function assertExists(relPath, label = relPath) {
  const abs = join(repoRoot, relPath);
  if (!existsSync(abs)) fail(`Missing ${label}: ${relPath}`);
}

function ciSafeEnv() {
  const env = { ...process.env };
  delete env.ZEREF_LIVE_INSTAGRAM;
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

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

if (process.env.ZEREF_LIVE_INSTAGRAM === "1") {
  console.warn(
    "[verify:phase-2] ZEREF_LIVE_INSTAGRAM=1 is set; default verify path runs fixture-only tests (Q3 / ADR-006).",
  );
}

assertExists("docs/governance/phase-2-contract.md", "Phase 2 contract");

for (const adr of [
  "docs/governance/adr/ADR-004-instagram-merge.md",
  "docs/governance/adr/ADR-005-worker-collect.md",
  "docs/governance/adr/ADR-006-parse-fetch-live.md",
]) {
  assertExists(adr);
}

assertExists("packages/instagram/package.json", "@zeref/instagram");
assertExists("scripts/enqueue-collect.mjs", "enqueue-collect CLI");

for (const fixture of EXPECTED_ROOT_FIXTURES) {
  assertExists(`fixtures/phase-2/${fixture}`, `fixture ${fixture}`);
}

for (const fixture of EXPECTED_GRAPH_FIXTURES) {
  assertExists(`fixtures/phase-2/graph/${fixture}`, `graph fixture ${fixture}`);
}

for (const fixture of EXPECTED_HTML_FIXTURES) {
  assertExists(`fixtures/phase-2/html/${fixture}`, `html fixture ${fixture}`);
}

run("npm", ["run", "build"]);

assertExists("packages/contracts/dist/index.js", "contracts build output");
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
if (typeof contracts.PHASE2_CONTRACT_VERSION !== "string") {
  fail("PHASE2_CONTRACT_VERSION export missing (C7)");
}
if (typeof contracts.CollectJobOutputSchema?.parse !== "function") {
  fail("CollectJobOutputSchema export missing (C7)");
}

assertExists("apps/worker/dist/index.js", "worker build output");
const worker = await import(
  pathToFileURL(join(repoRoot, "apps/worker/dist/index.js")).href
);
// Phase 2 C9: collect must be registered. Phase 3+ may add normalize/embed (C12 enforced in verify:phase-3).
if (!Array.isArray(worker.WORKER_JOB_NAMES) || !worker.WORKER_JOB_NAMES.includes("collect")) {
  fail("WORKER_JOB_NAMES must include collect (C9)");
}
// analyze/report registry enforced in verify:phase-4 (C18); Phase 2 only requires collect (C9).

run("npm", ["-w", "@zeref/contracts", "test"]);
run("npm", ["-w", "@zeref/instagram", "test"]);
run("npm", ["-w", "@zeref/worker", "test"]);

if (!process.exitCode) {
  console.log("[verify:phase-2] OK");
}
