import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const PHASE51_E2E_SPEC = "apps/web/e2e/cockpit-hud-5.1.spec.ts";
const PHASE61_E2E_SPEC = "apps/web/e2e/cockpit-hud-6.1.spec.ts";

const REFERENCE_SCREENSHOT =
  "docs/design/reference/screenshots/zeref-cockpit-6.1-hud.png";

/** C48 carry-forward (phase-5.1-contract C48). */
const C48_TESTIDS = [
  "hud-header",
  "hud-footer",
  "telemetry-simulated",
  "audio-io-simulated",
];

/** C91–C94 DOM markers wired at P6.1-A @ f6a3d01. */
const C91_MARKERS = ["hud-header", "status-chip", "Phase 6.1"];
const C92_MARKERS = ["hud-footer", "hud-footer-objective", "hud-footer-telemetry-row"];
const C93_MARKERS = [
  "panel-studio",
  "panel-calendar",
  "panel-reports",
  "panel-research",
  "glass-column",
  "hud-panel",
];
const C94_MARKERS = ["telemetry-strip", "telemetry-simulated", "audio-io-live"];

function fail(message) {
  console.error(`[verify:phase-6.1] ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`[verify:phase-6.1] ${message}`);
}

function assertExists(relPath, label = relPath) {
  if (!existsSync(join(repoRoot, relPath))) fail(`Missing ${label}: ${relPath}`);
}

function ciSafeEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.ZEREF_LIVE_INSTAGRAM;
  delete env.OPENROUTER_API_KEY;
  delete env.OPENAI_API_KEY;
  delete env.ZEREF_NOMIC_EMBED_URL;
  env.ZEREF_LLM_MOCK = "1";
  env.ZEREF_EMBED_PROVIDER = "mock";
  env.ZEREF_BFF_FIXTURE = "1";
  env.ZEREF_PHASE51_UI = env.ZEREF_PHASE51_UI ?? "1";
  env.SKIP_DB_TESTS = "1";
  env.CI = "true";
  const port = env.PLAYWRIGHT_PORT ?? "3099";
  env.PLAYWRIGHT_PORT = port;
  env.PORT = port;
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

function assertSpecCoversMarkers(specPath, markers, label) {
  const source = readFileSync(join(repoRoot, specPath), "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) {
      fail(`${label}: ${specPath} must reference ${marker}`);
    }
  }
}

function assertPhase61E2eGateDocumented() {
  const source = readFileSync(join(repoRoot, PHASE61_E2E_SPEC), "utf8");
  if (!source.includes("ZEREF_PHASE61_UI")) {
    fail(`${PHASE61_E2E_SPEC} must document ZEREF_PHASE61_UI enforcement gate (C96)`);
  }
}

function runPriorPhases() {
  console.log("[verify:phase-6.1] chaining verify:phase-5.1 …");
  run("npm", ["run", "verify:phase-5.1"]);
}

function runPhase61HudPlaywright() {
  const uiReady = process.env.ZEREF_PHASE61_UI === "1";
  if (!uiReady) {
    warn(
      "C91–C94 Playwright deferred: ZEREF_PHASE61_UI unset — HUD Tier-2 tests skipped until P6.1-E CI flag.",
    );
    warn(
      "Expected when enabled: cockpit-hud-5.1.spec.ts (C48) + cockpit-hud-6.1.spec.ts (C91–C94).",
    );
    return;
  }

  const env = ciSafeEnv({
    ZEREF_PHASE61_UI: "1",
    ZEREF_PHASE51_UI: "1",
    ZEREF_PLAYWRIGHT_REUSE: "1",
  });

  run("npm", ["-w", "@zeref/web", "run", "test:e2e:install"], env);

  for (const spec of [PHASE51_E2E_SPEC, PHASE61_E2E_SPEC]) {
    const relSpec = spec.replace(/^apps\/web\//, "");
    console.log(`[verify:phase-6.1] Playwright ${relSpec} …`);
    const res = spawnSync(
      "npm",
      ["-w", "@zeref/web", "run", "test:e2e", "--", relSpec],
      {
        cwd: repoRoot,
        stdio: "inherit",
        shell: process.platform === "win32",
        env,
      },
    );

    if (res.status !== 0) {
      fail(`C96 Playwright ${relSpec} failed (ZEREF_PHASE61_UI=1)`);
    }
  }
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

assertExists("docs/governance/phase-6.1-contract.md", "Phase 6.1 contract");
assertExists("docs/governance/adr/ADR-033-luke-tier2-visual-acceptance.md", "ADR-033");
assertExists(REFERENCE_SCREENSHOT, "Planner reference screenshot (ADR-033)");
assertExists(PHASE51_E2E_SPEC, "Playwright cockpit-hud-5.1 spec");
assertExists(PHASE61_E2E_SPEC, "Playwright cockpit-hud-6.1 spec");

assertSpecCoversMarkers(PHASE61_E2E_SPEC, C91_MARKERS, "C91");
assertSpecCoversMarkers(PHASE61_E2E_SPEC, C92_MARKERS, "C92");
assertSpecCoversMarkers(PHASE61_E2E_SPEC, C93_MARKERS, "C93");
assertSpecCoversMarkers(PHASE61_E2E_SPEC, C94_MARKERS, "C94");
assertPhase61E2eGateDocumented();

runPriorPhases();
runPhase61HudPlaywright();

if (!process.exitCode) {
  console.log("[verify:phase-6.1] OK");
  if (process.env.ZEREF_PHASE61_UI !== "1") {
    console.log(
      "[verify:phase-6.1] Note: C91–C94 Playwright assertions are soft until ZEREF_PHASE61_UI=1.",
    );
  }
}
