import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

const PHASE11_AGENT_E2E = "apps/web/e2e/jarvis-agent-11.spec.ts";
const PHASE11_EVAL = "eval/jarvis/run-eval.mjs";

function fail(message) {
  console.error(`[verify:phase-11] ${message}`);
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

/** Chaining verify:phase-10.5 must not see Phase 11 agent env. */
function priorGateEnv(extra = {}) {
  const env = ciSafeEnv(extra);
  delete env.ZEREF_PHASE11_AGENT;
  return env;
}

function runPhase105Chain() {
  console.log("[verify:phase-11] chaining verify:phase-10.5 (C159) ...");
  run(
    "npm",
    ["run", "verify:phase-10.5"],
    priorGateEnv({
      ZEREF_PHASE6_VOICE: "1",
      ZEREF_PHASE7_BRAIN: "1",
      ZEREF_PHASE8_PRODUCT: "1",
      ZEREF_PHASE9_RESEARCH: "1",
      ZEREF_PHASE10_OPS: "1",
      ZEREF_PHASE105_STABILITY: "1",
    }),
  );
}

function runJarvisKernelTests() {
  console.log("[verify:phase-11] running @zeref/jarvis-kernel unit tests ...");
  run("npm", ["test", "-w", "@zeref/jarvis-kernel"], ciSafeEnv());
}

function assertPhase11E2eSpecDocumentsAgentGate(specPath) {
  const source = readFileSync(join(repoRoot, specPath), "utf8");
  if (!source.includes("ZEREF_PHASE11_AGENT")) {
    fail(`${specPath} must document ZEREF_PHASE11_AGENT enforcement gate (C161)`);
  }
  if (!source.includes("/api/v1/jarvis/run")) {
    fail(`${specPath} must assert POST /api/v1/jarvis/run agent flow`);
  }
  if (!source.includes("awaiting_confirm")) {
    fail(`${specPath} must assert write-high confirm gate (awaiting_confirm)`);
  }
}

function runJarvisEvalHarness() {
  if (!existsSync(join(repoRoot, PHASE11_EVAL))) {
    fail("C160: eval/jarvis/run-eval.mjs required (P11-D)");
  }

  console.log("[verify:phase-11] C160: running JARVIS eval harness (0 unsafe actions hard-fail) ...");
  run(
    "node",
    ["--import", "tsx", PHASE11_EVAL],
    ciSafeEnv({ ZEREF_PHASE11_AGENT: "1" }),
  );
}

async function runPhase11AgentPlaywright() {
  if (!existsSync(join(repoRoot, PHASE11_AGENT_E2E))) {
    console.log(
      "[verify:phase-11] C161: jarvis-agent-11.spec.ts not present - skipping agent e2e (P11-D)",
    );
    return;
  }

  if (process.env.ZEREF_PHASE11_AGENT !== "1") {
    console.log(
      "[verify:phase-11] C161: ZEREF_PHASE11_AGENT not set - skipping jarvis-agent-11 e2e",
    );
    return;
  }

  const env = ciSafeEnv({
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
      fail(`C161: web server not ready for jarvis-agent-11 e2e: ${message}`);
    }
    env.ZEREF_PLAYWRIGHT_REUSE = "1";
  }

  const res = spawnSync(
    "npm",
    ["-w", "@zeref/web", "run", "test:e2e", "--", "e2e/jarvis-agent-11.spec.ts"],
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
    fail("C161 Playwright jarvis-agent-11.spec.ts failed (ZEREF_PHASE11_AGENT=1)");
  }
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

freePlaywrightPort(process.env.PLAYWRIGHT_PORT ?? "3099");

if (process.env.ZEREF_JOB_ENQUEUE_MOCK !== "1") {
  fail("C159: ZEREF_JOB_ENQUEUE_MOCK=1 required for verify:phase-11");
}

if (process.env.ZEREF_BFF_FIXTURE !== "1") {
  fail("C159: ZEREF_BFF_FIXTURE=1 required for verify:phase-11");
}

assertExists("docs/governance/phase-11-contract.md", "Phase 11 contract");
assertExists(
  "docs/governance/adr/ADR-039-jarvis-core-extraction-mcp-tools.md",
  "ADR-039",
);
assertExists(
  "docs/governance/adr/ADR-040-agent-loop-budgets-capability-audit.md",
  "ADR-040",
);
assertExists("docs/governance/adr/ADR-041-jarvis-eval-harness.md", "ADR-041");
assertExists(PHASE11_EVAL, "C160 eval harness");
assertExists(PHASE11_AGENT_E2E, "C161 jarvis-agent e2e");
assertPhase11E2eSpecDocumentsAgentGate(PHASE11_AGENT_E2E);

runPhase105Chain();
runJarvisKernelTests();
runJarvisEvalHarness();
await runPhase11AgentPlaywright();

if (!process.exitCode) {
  console.log("[verify:phase-11] OK");
  console.log(
    "[verify:phase-11] C159 chained verify:phase-10.5 (Phases 0-10.5 preserved).",
  );
  console.log("[verify:phase-11] C160 JARVIS eval harness enforced.");
  if (process.env.ZEREF_PHASE11_AGENT === "1") {
    console.log(
      "[verify:phase-11] C161 Playwright jarvis-agent-11.spec.ts enforced (ZEREF_PHASE11_AGENT=1).",
    );
  }
}
