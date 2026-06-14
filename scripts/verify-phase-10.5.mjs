import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const PHASE105_STABILITY_E2E = "apps/web/e2e/cockpit-stability-10.5.spec.ts";

function fail(message) {
  console.error(`[verify:phase-10.5] ${message}`);
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

function assertPhase105E2eSpecDocumentsStabilityGate(specPath) {
  const source = readFileSync(join(repoRoot, specPath), "utf8");
  if (!source.includes("ZEREF_PHASE105_STABILITY")) {
    fail(`${specPath} must document ZEREF_PHASE105_STABILITY enforcement gate`);
  }
  if (!source.includes("EventSource")) {
    fail(`${specPath} must assert single EventSource per cockpit tab (C128)`);
  }
}

/** Chaining verify:phase-10 must not see Phase 10.5 stability env. */
function priorGateEnv(extra = {}) {
  const env = ciSafeEnv(extra);
  delete env.ZEREF_PHASE105_STABILITY;
  return env;
}

function runPhase10Chain() {
  console.log("[verify:phase-10.5] chaining verify:phase-10 (C140) …");
  run(
    "npm",
    ["run", "verify:phase-10"],
    priorGateEnv({
      ZEREF_PHASE6_VOICE: "1",
      ZEREF_PHASE7_BRAIN: "1",
      ZEREF_PHASE8_PRODUCT: "1",
      ZEREF_PHASE9_RESEARCH: "1",
      ZEREF_PHASE10_OPS: "1",
    }),
  );
}

function runWebUnitTests() {
  console.log("[verify:phase-10.5] running @zeref/web unit tests …");
  run("npm", ["test", "-w", "@zeref/web"], ciSafeEnv({ ZEREF_PHASE10_OPS: "1" }));
}

async function runPhase105StabilityPlaywright() {
  if (process.env.ZEREF_PHASE105_STABILITY !== "1") {
    console.log(
      "[verify:phase-10.5] C128: ZEREF_PHASE105_STABILITY not set — skipping stability e2e",
    );
    return;
  }

  const env = ciSafeEnv({
    ZEREF_PHASE105_STABILITY: "1",
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
      fail(`C128: web server not ready for stability e2e: ${message}`);
    }
    env.ZEREF_PLAYWRIGHT_REUSE = "1";
  }

  const res = spawnSync(
    "npm",
    ["-w", "@zeref/web", "run", "test:e2e", "--", "e2e/cockpit-stability-10.5.spec.ts"],
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
    fail("C128 Playwright cockpit-stability-10.5.spec.ts failed (ZEREF_PHASE105_STABILITY=1)");
  }
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

if (process.env.ZEREF_JOB_ENQUEUE_MOCK !== "1") {
  fail("C140: ZEREF_JOB_ENQUEUE_MOCK=1 required for verify:phase-10.5");
}

if (process.env.ZEREF_BFF_FIXTURE !== "1") {
  fail("C140: ZEREF_BFF_FIXTURE=1 required for verify:phase-10.5");
}

if (process.env.ZEREF_PHASE10_OPS !== "1") {
  fail("C140: ZEREF_PHASE10_OPS=1 required for verify:phase-10.5");
}

assertExists("docs/governance/phase-10.5-contract.md", "Phase 10.5 contract");
assertExists("docs/governance/adr/ADR-037-sse-outbox-consolidation.md", "ADR-037");
assertExists("docs/governance/adr/ADR-038-worker-health-real-probe.md", "ADR-038");
assertExists(PHASE105_STABILITY_E2E, "Playwright cockpit-stability-10.5 spec");

assertPhase105E2eSpecDocumentsStabilityGate(PHASE105_STABILITY_E2E);

runPhase10Chain();
runWebUnitTests();
await runPhase105StabilityPlaywright();

if (!process.exitCode) {
  console.log("[verify:phase-10.5] OK");
  console.log("[verify:phase-10.5] C140 chained verify:phase-10 (Phases 0–10 preserved).");
  if (process.env.ZEREF_PHASE105_STABILITY === "1") {
    console.log(
      "[verify:phase-10.5] C128 Playwright cockpit-stability-10.5.spec.ts enforced (ZEREF_PHASE105_STABILITY=1).",
    );
  }
}
