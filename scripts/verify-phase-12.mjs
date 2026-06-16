import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function freePlaywrightPort(port) {
  const portStr = String(port);
  if (process.platform === "win32") {
    const res = spawnSync("netstat", ["-ano"], {
      encoding: "utf8",
      shell: true,
    });
    if (res.status !== 0 || !res.stdout) return;
    const pids = new Set();
    for (const line of res.stdout.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      if (!new RegExp(`:${portStr}\\s`).test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid) && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      spawnSync("taskkill", ["/pid", pid, "/f"], { shell: true, stdio: "ignore" });
    }
    return;
  }
  spawnSync("sh", ["-c", `command -v lsof >/dev/null 2>&1 && lsof -ti :${portStr} | xargs kill -9`], {
    stdio: "ignore",
  });
}

const PHASE12_DATA_E2E = "apps/web/e2e/cockpit-data-age-12.spec.ts";

function fail(message) {
  console.error(`[verify:phase-12] ${message}`);
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
  if (process.env.ZEREF_PHASE12_DATA === "1") {
    env.ZEREF_PHASE12_DATA = "1";
  }
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

/** Chaining verify:phase-11 must not see Phase 12 data-age env. */
function priorGateEnv(extra = {}) {
  const env = ciSafeEnv(extra);
  delete env.ZEREF_PHASE12_DATA;
  return env;
}

function runPhase11Chain() {
  console.log("[verify:phase-12] chaining verify:phase-11 (C173) ...");
  run(
    "npm",
    ["run", "verify:phase-11"],
    priorGateEnv({
      ZEREF_PHASE6_VOICE: "1",
      ZEREF_PHASE7_BRAIN: "1",
      ZEREF_PHASE8_PRODUCT: "1",
      ZEREF_PHASE9_RESEARCH: "1",
      ZEREF_PHASE10_OPS: "1",
      ZEREF_PHASE105_STABILITY: "1",
      ZEREF_PHASE11_AGENT: "1",
    }),
  );
}

function runContractsTests() {
  console.log("[verify:phase-12] running @zeref/contracts unit tests ...");
  run("npm", ["test", "-w", "@zeref/contracts"], ciSafeEnv());
}

function runWorkerTests() {
  console.log("[verify:phase-12] running @zeref/worker unit tests ...");
  run("npm", ["test", "-w", "@zeref/worker"], ciSafeEnv({ SKIP_DB_TESTS: "1" }));
}

function runWebTests() {
  console.log("[verify:phase-12] running @zeref/web unit tests ...");
  run("npm", ["test", "-w", "@zeref/web"], ciSafeEnv({ ZEREF_BFF_FIXTURE: "1" }));
}

async function runPhase12DataPlaywright() {
  if (!existsSync(join(repoRoot, PHASE12_DATA_E2E))) {
    fail(`C175: ${PHASE12_DATA_E2E} required (P12-D)`);
  }

  if (process.env.ZEREF_PHASE12_DATA !== "1") {
    console.log(
      "[verify:phase-12] C175: ZEREF_PHASE12_DATA not set - skipping cockpit-data-age-12 e2e",
    );
    return;
  }

  const env = ciSafeEnv({
    ZEREF_PHASE12_DATA: "1",
    ZEREF_PHASE11_AGENT: "1",
    ZEREF_PHASE10_OPS: "1",
    ZEREF_PHASE105_STABILITY: "1",
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
      fail(`C175: web server not ready for cockpit-data-age-12 e2e: ${message}`);
    }
    env.ZEREF_PLAYWRIGHT_REUSE = "1";
  }

  const res = spawnSync(
    "npm",
    ["-w", "@zeref/web", "run", "test:e2e", "--", "e2e/cockpit-data-age-12.spec.ts"],
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
    fail("C175 Playwright cockpit-data-age-12.spec.ts failed (ZEREF_PHASE12_DATA=1)");
  }
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

freePlaywrightPort(process.env.PLAYWRIGHT_PORT ?? "3099");

if (process.env.ZEREF_JOB_ENQUEUE_MOCK !== "1") {
  fail("C171: ZEREF_JOB_ENQUEUE_MOCK=1 required for verify:phase-12");
}

if (process.env.ZEREF_BFF_FIXTURE !== "1") {
  fail("C171: ZEREF_BFF_FIXTURE=1 required for verify:phase-12");
}

assertExists("docs/governance/phase-12-contract.md", "Phase 12 contract");
assertExists(
  "docs/governance/adr/ADR-042-scheduled-collect-data-age.md",
  "ADR-042",
);
assertExists("apps/web/components/hud/DataAgeBadge.tsx", "DataAgeBadge");
assertExists("apps/web/lib/data-age.ts", "data-age lib");
assertExists("packages/contracts/src/phase12/data-age.ts", "phase12 data-age contract");
assertExists("apps/worker/src/jobs/schedule-collect.ts", "schedule-collect job");
assertExists(PHASE12_DATA_E2E, "C175 cockpit-data-age e2e");

runPhase11Chain();
runContractsTests();
runWorkerTests();
runWebTests();
await runPhase12DataPlaywright();

if (!process.exitCode) {
  console.log("[verify:phase-12] OK");
  console.log(
    "[verify:phase-12] C173 chained verify:phase-11 (Phases 0-11 preserved).",
  );
  console.log("[verify:phase-12] Phase 12 contracts + worker + web unit tests enforced.");
  if (process.env.ZEREF_PHASE12_DATA === "1") {
    console.log(
      "[verify:phase-12] C175 Playwright cockpit-data-age-12.spec.ts enforced (ZEREF_PHASE12_DATA=1).",
    );
  }
}
