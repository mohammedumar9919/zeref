import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const PHASE62_E2E_SPEC = "apps/web/e2e/cockpit-workspace-6.2.spec.ts";
const PHASE61_E2E_SPEC = "apps/web/e2e/cockpit-hud-6.1.spec.ts";
const GLOBALS_CSS = "apps/web/app/globals.css";
const GLOBE_HERO = "apps/web/components/globe/GlobeHero.tsx";

/** C99–C106 DOM markers (phase-6.2-contract). */
const C99_MARKERS = [
  "workspace-mode",
  "data-workspace-surface",
  "cockpit-grid",
  "/cockpit/studio",
  "/cockpit/calendar",
  "/cockpit/reports",
  "/cockpit/research",
];
const C100_MARKERS = ["top-nav", "hud-header", "data-unified-header", "hud-header-objective"];
const C101_MARKERS = ["globe-hero", "0.58"];
const C102_MARKERS = ["globe-voice-pulse", "data-globe-voice-state", "prefers-reduced-motion"];
const C103_MARKERS = ["globe-jarvis-sync", "data-globe-brain-state"];

function fail(message) {
  console.error(`[verify:phase-6.2] ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`[verify:phase-6.2] ${message}`);
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
  env.ZEREF_PHASE61_UI = env.ZEREF_PHASE61_UI ?? "1";
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

function assertReducedMotionCss() {
  const source = readFileSync(join(repoRoot, GLOBALS_CSS), "utf8");
  if (!source.includes("prefers-reduced-motion")) {
    fail(`${GLOBALS_CSS} must honor prefers-reduced-motion for pulse/sync rings (C102/C104)`);
  }
  if (!source.includes("globe-voice-pulse") && !source.includes("globe-voice-pulse-ring")) {
    fail(`${GLOBALS_CSS} must define voice pulse ring styles (C102)`);
  }
  if (!source.includes("globe-jarvis-sync")) {
    fail(`${GLOBALS_CSS} must define JARVIS sync ring styles (C103)`);
  }
  if (!source.includes("58vh")) {
    fail(`${GLOBALS_CSS} must set globe hero min-height 58vh (C101)`);
  }
}

function assertPhase62E2eGateDocumented() {
  const source = readFileSync(join(repoRoot, PHASE62_E2E_SPEC), "utf8");
  if (!source.includes("ZEREF_PHASE62_UI")) {
    fail(`${PHASE62_E2E_SPEC} must document ZEREF_PHASE62_UI enforcement gate (C110)`);
  }
}

function runPriorPhases() {
  if (process.env.ZEREF_SKIP_PRIOR_CHAIN === "1") {
    console.log(
      "[verify:phase-6.2] skipping verify:phase-6.1 (ZEREF_SKIP_PRIOR_CHAIN=1 — prior CI step already ran it).",
    );
    return;
  }
  console.log("[verify:phase-6.2] chaining verify:phase-6.1 …");
  run("npm", ["run", "verify:phase-6.1"]);
}

function runPhase62WorkspacePlaywright() {
  const uiReady = process.env.ZEREF_PHASE62_UI === "1";
  if (!uiReady) {
    warn(
      "C99–C106 Playwright deferred: ZEREF_PHASE62_UI unset — workspace Tier-3 tests skipped until CI flag.",
    );
    warn("Expected when enabled: cockpit-workspace-6.2.spec.ts (C99–C106).");
    return;
  }

  const env = ciSafeEnv({
    ZEREF_PHASE62_UI: "1",
    ZEREF_PHASE61_UI: "1",
    ZEREF_PHASE51_UI: "1",
    ZEREF_PLAYWRIGHT_REUSE: "1",
  });

  run("npm", ["-w", "@zeref/web", "run", "test:e2e:install"], env);

  const relSpec = PHASE62_E2E_SPEC.replace(/^apps\/web\//, "");
  console.log(`[verify:phase-6.2] Playwright ${relSpec} …`);
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
    fail(`C106 Playwright ${relSpec} failed (ZEREF_PHASE62_UI=1)`);
  }
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

assertExists("docs/governance/phase-6.2-contract.md", "Phase 6.2 contract");
assertExists("docs/governance/adr/ADR-035-globe-pulse-workspace-ux.md", "ADR-035");
assertExists(PHASE61_E2E_SPEC, "Playwright cockpit-hud-6.1 spec (prior gate)");
assertExists(PHASE62_E2E_SPEC, "Playwright cockpit-workspace-6.2 spec");
assertExists(GLOBE_HERO, "GlobeHero wrapper (C104)");
assertExists(GLOBALS_CSS, "globals.css pulse/hero tokens");

assertSpecCoversMarkers(PHASE62_E2E_SPEC, C99_MARKERS, "C99");
assertSpecCoversMarkers(PHASE62_E2E_SPEC, C100_MARKERS, "C100");
assertSpecCoversMarkers(PHASE62_E2E_SPEC, C101_MARKERS, "C101");
assertSpecCoversMarkers(PHASE62_E2E_SPEC, C102_MARKERS, "C102");
assertSpecCoversMarkers(PHASE62_E2E_SPEC, C103_MARKERS, "C103");
assertPhase62E2eGateDocumented();
assertReducedMotionCss();

runPriorPhases();
runPhase62WorkspacePlaywright();

if (!process.exitCode) {
  console.log("[verify:phase-6.2] OK");
  if (process.env.ZEREF_PHASE62_UI !== "1") {
    console.log(
      "[verify:phase-6.2] Note: C99–C106 Playwright assertions are soft until ZEREF_PHASE62_UI=1.",
    );
  }
}
