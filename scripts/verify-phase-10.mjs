import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const PHASE10_OPS_E2E = "apps/web/e2e/cockpit-ops-10.spec.ts";

const EXPECTED_PHASE10_FIXTURES = ["worker-health.valid.json"];

function fail(message) {
  console.error(`[verify:phase-10] ${message}`);
  process.exitCode = 1;
}

function assertExists(relPath, label = relPath) {
  if (!existsSync(join(repoRoot, relPath))) fail(`Missing ${label}: ${relPath}`);
}

function ciSafeEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.ZEREF_LIVE_INSTAGRAM;
  delete env.OPENROUTER_API_KEY;
  delete env.OPENAI_API_KEY;
  delete env.ELEVENLABS_API_KEY;
  delete env.ZEREF_NOMIC_EMBED_URL;
  env.ZEREF_LLM_MOCK = "1";
  env.ZEREF_TTS_MOCK = "1";
  env.ZEREF_WHISPER_MOCK = "1";
  env.ZEREF_EMBED_PROVIDER = "mock";
  env.ZEREF_BFF_FIXTURE = "1";
  env.ZEREF_PHASE51_UI = "1";
  env.ZEREF_MEMORY_MOCK = "1";
  env.ZEREF_JOB_ENQUEUE_MOCK = "1";
  env.SKIP_DB_TESTS = "1";
  env.CI = "true";
  const port = env.PLAYWRIGHT_PORT ?? "3099";
  env.PLAYWRIGHT_PORT = port;
  env.PORT = port;
  return env;
}



async function waitForHttpOk(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok) return;
    } catch {
      /* retry until timeout */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function stopOwnedWebServer(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/f", "/t"], {
      shell: process.platform === "win32",
      stdio: "ignore",
    });
    return;
  }
  child.kill("SIGTERM");
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

function assertPhase10E2eSpecDocumentsOpsGate(specPath) {
  const source = readFileSync(join(repoRoot, specPath), "utf8");
  if (!source.includes("ZEREF_PHASE10_OPS")) {
    fail(`${specPath} must document ZEREF_PHASE10_OPS enforcement gate`);
  }
  if (!source.includes("/api/v1/ops/worker-health")) {
    fail(`${specPath} must assert GET /api/v1/ops/worker-health`);
  }
  if (!source.includes("consuming")) {
    fail(`${specPath} must assert honest consuming field in worker-health response`);
  }
}

/** Chaining prior gates must not see Phase 10 ops env. */
function priorGateEnv(extra = {}) {
  const env = ciSafeEnv(extra);
  delete env.ZEREF_PHASE10_OPS;
  return env;
}

function runHotfixChain() {
  console.log("[verify:phase-10] chaining verify:hotfix-p8 …");
  run(
    "npm",
    ["run", "verify:hotfix-p8"],
    priorGateEnv({
      ZEREF_PHASE7_BRAIN: "1",
      ZEREF_PHASE6_VOICE: "1",
      ZEREF_PHASE8_PRODUCT: "1",
    }),
  );
}

function runPhase9Chain() {
  console.log("[verify:phase-10] chaining verify:phase-9 …");
  run(
    "npm",
    ["run", "verify:phase-9"],
    priorGateEnv({
      ZEREF_PHASE7_BRAIN: "1",
      ZEREF_PHASE6_VOICE: "1",
      ZEREF_PHASE8_PRODUCT: "1",
      ZEREF_PHASE9_RESEARCH: "1",
    }),
  );
}

function runPhase10OpsUnitTests() {
  const env = ciSafeEnv({ ZEREF_PHASE10_OPS: "1" });
  const res = spawnSync(
    "node",
    ["--import", "tsx", "--test", "test/phase-10-ops.test.mjs"],
    {
      cwd: join(repoRoot, "apps/web"),
      stdio: "inherit",
      shell: process.platform === "win32",
      env,
    },
  );
  if (res.status !== 0) fail("Command failed: node --import tsx --test test/phase-10-ops.test.mjs");
}

async function runPhase10OpsPlaywright() {
  if (process.env.ZEREF_PHASE10_OPS !== "1") {
    fail("C119: ZEREF_PHASE10_OPS=1 required - refusing to skip cockpit-ops-10 e2e");
    return;
  }

  const env = ciSafeEnv({
    ZEREF_PHASE10_OPS: "1",
    ZEREF_PHASE9_RESEARCH: "1",
    ZEREF_PHASE8_PRODUCT: "1",
    ZEREF_PHASE7_BRAIN: "1",
    ZEREF_PHASE6_VOICE: "1",
  });

  run("npm", ["-w", "@zeref/web", "run", "test:e2e:install"], env);

  const perfScript = join(repoRoot, "scripts/perf-smoke.mjs");
  let ownedServer = null;
  const port = env.PLAYWRIGHT_PORT ?? "3099";
  const cockpitUrl = `http://127.0.0.1:${port}/cockpit`;

  if (existsSync(perfScript)) {
    ownedServer = spawn("npm", ["run", "start"], {
      cwd: join(repoRoot, "apps/web"),
      stdio: "ignore",
      shell: process.platform === "win32",
      env,
    });
    try {
      await waitForHttpOk(cockpitUrl);
    } catch (err) {
      stopOwnedWebServer(ownedServer);
      const message = err instanceof Error ? err.message : String(err);
      fail(`C122: web server not ready for perf-smoke/e2e: ${message}`);
    }
    runPerfSmokeAdvisory(env);
    env.ZEREF_PLAYWRIGHT_REUSE = "1";
  }

  const res = spawnSync(
    "npm",
    ["-w", "@zeref/web", "run", "test:e2e", "--", "e2e/cockpit-ops-10.spec.ts"],
    {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env,
    },
  );

  if (ownedServer) {
    stopOwnedWebServer(ownedServer);
  }

  if (res.status !== 0) {
    fail("C119 Playwright cockpit-ops-10.spec.ts failed (ZEREF_PHASE10_OPS=1)");
  }
}

function runPerfSmokeAdvisory(env = ciSafeEnv({ ZEREF_PHASE10_OPS: "1" })) {
  const perfScript = join(repoRoot, "scripts/perf-smoke.mjs");
  if (!existsSync(perfScript)) {
    console.log("[verify:phase-10] C122: perf-smoke.mjs not present — skipping advisory");
    return;
  }

  console.log("[verify:phase-10] C122 advisory perf-smoke (non-blocking) …");
  const res = spawnSync("node", ["scripts/perf-smoke.mjs", "--advisory"], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });

  if (res.status !== 0) {
    console.warn(
      "[verify:phase-10] C122 perf-smoke advisory exceeded budget (non-blocking — see docs/governance/verify.md)",
    );
  }
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

if (process.env.ZEREF_JOB_ENQUEUE_MOCK !== "1") {
  fail("C118: ZEREF_JOB_ENQUEUE_MOCK=1 required for verify:phase-10");
}

if (process.env.ZEREF_BFF_FIXTURE !== "1") {
  fail("C118: ZEREF_BFF_FIXTURE=1 required for verify:phase-10");
}

if (process.env.ZEREF_PHASE10_OPS !== "1") {
  fail("C119: ZEREF_PHASE10_OPS=1 required for verify:phase-10");
}

assertExists("docs/governance/phase-10-contract.md", "Phase 10 contract");
assertExists("docs/governance/adr/ADR-036-live-ops-pipeline-truth.md", "ADR-036");
assertExists("packages/contracts/src/phase10/index.ts", "Phase 10 contracts");
assertExists("apps/web/lib/ops/worker-health.ts", "worker-health lib");
assertExists("apps/web/app/api/v1/ops/worker-health/route.ts", "worker-health route");
assertExists("apps/web/test/phase-10-ops.test.mjs", "phase 10 ops unit tests");
assertExists(PHASE10_OPS_E2E, "Playwright cockpit-ops-10 spec");

for (const fixture of EXPECTED_PHASE10_FIXTURES) {
  assertExists(`fixtures/phase-10/${fixture}`, `fixture ${fixture}`);
}

assertPhase10E2eSpecDocumentsOpsGate(PHASE10_OPS_E2E);

runHotfixChain();
runPhase9Chain();

assertExists("packages/contracts/dist/index.js", "contracts build output");
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
if (contracts.PHASE10_CONTRACT_VERSION !== "10.0.0") {
  fail("PHASE10_CONTRACT_VERSION must be 10.0.0 (C114)");
}
if (typeof contracts.WorkerHealthResponseSchema?.parse !== "function") {
  fail("WorkerHealthResponseSchema export missing (C114)");
}

const workerHealthFixture = contracts.WorkerHealthResponseSchema.parse(
  JSON.parse(readFileSync(join(repoRoot, "fixtures/phase-10/worker-health.valid.json"), "utf8")),
);
if (workerHealthFixture.consuming !== false || workerHealthFixture.source !== "fixture") {
  fail("fixtures/phase-10/worker-health.valid.json round-trip failed (C115)");
}

runPhase10OpsUnitTests();
await runPhase10OpsPlaywright();

if (!process.exitCode) {
  console.log("[verify:phase-10] OK");
  console.log(
    "[verify:phase-10] C119 Playwright cockpit-ops-10.spec.ts enforced (ZEREF_PHASE10_OPS=1).",
  );
  console.log(
    "[verify:phase-10] C118 chained verify:hotfix-p8 → verify:phase-9 (prior gates preserved).",
  );
}
