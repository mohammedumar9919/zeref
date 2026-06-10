import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const STUDIO_HUB_E2E = "apps/web/e2e/cockpit-studio-hub.spec.ts";
const REPORTS_HUB_E2E = "apps/web/e2e/cockpit-reports-hub.spec.ts";

const STUDIO_HUB_TESTIDS = ["studio-hub"];
const REPORTS_HUB_TESTIDS = ["reports-hub", "report-artifact-detail"];

const FIXTURE_ARTIFACT_ID = "550e8400-e29b-41d4-a716-446655440000";

function fail(message) {
  console.error(`[verify:hotfix-p8] ${message}`);
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

function run(cmd, args, env = ciSafeEnv()) {
  const res = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (res.status !== 0) fail(`Command failed: ${cmd} ${args.join(" ")}`);
}

function assertHotfixE2eSpecDocumentsTestids(specPath, testids, label) {
  const source = readFileSync(join(repoRoot, specPath), "utf8");
  for (const testid of testids) {
    if (!source.includes(testid)) {
      fail(`${label}: ${specPath} must reference data-testid ${testid}`);
    }
  }
  if (!source.includes("ZEREF_PHASE8_PRODUCT")) {
    fail(`${label}: ${specPath} must document ZEREF_PHASE8_PRODUCT enforcement gate`);
  }
  if (!source.includes("ZEREF_BFF_FIXTURE")) {
    fail(`${label}: ${specPath} must document ZEREF_BFF_FIXTURE enforcement gate`);
  }
}

function runPriorPhases() {
  console.log("[verify:hotfix-p8] chaining verify:phase-8 …");
  run(
    "npm",
    ["run", "verify:phase-8"],
    ciSafeEnv({
      ZEREF_PHASE7_BRAIN: "1",
      ZEREF_PHASE6_VOICE: "1",
      ZEREF_PHASE8_PRODUCT: "1",
    }),
  );
}

function runHotfixPlaywright() {
  if (process.env.ZEREF_PHASE8_PRODUCT !== "1") {
    fail("P8 hotfix: ZEREF_PHASE8_PRODUCT=1 required — refusing to skip hub e2e");
    return;
  }

  if (process.env.ZEREF_BFF_FIXTURE !== "1") {
    fail("P8 hotfix: ZEREF_BFF_FIXTURE=1 required — refusing to skip hub e2e");
    return;
  }

  const env = ciSafeEnv({
    ZEREF_PHASE8_PRODUCT: "1",
    ZEREF_PHASE7_BRAIN: "1",
    ZEREF_PHASE6_VOICE: "1",
  });

  run("npm", ["-w", "@zeref/web", "run", "test:e2e:install"], env);

  for (const spec of ["e2e/cockpit-studio-hub.spec.ts", "e2e/cockpit-reports-hub.spec.ts"]) {
    const res = spawnSync("npm", ["-w", "@zeref/web", "run", "test:e2e", "--", spec], {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env,
    });

    if (res.status !== 0) {
      fail(`P8 hotfix Playwright ${spec} failed (ZEREF_PHASE8_PRODUCT=1, ZEREF_BFF_FIXTURE=1)`);
    }
  }
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

if (process.env.ZEREF_JOB_ENQUEUE_MOCK !== "1") {
  fail("P8 hotfix: ZEREF_JOB_ENQUEUE_MOCK=1 required");
}

if (process.env.ZEREF_BFF_FIXTURE !== "1") {
  fail("P8 hotfix: ZEREF_BFF_FIXTURE=1 required");
}

if (process.env.ZEREF_PHASE8_PRODUCT !== "1") {
  fail("P8 hotfix: ZEREF_PHASE8_PRODUCT=1 required");
}

assertExists(STUDIO_HUB_E2E, "Playwright cockpit-studio-hub spec");
assertExists(REPORTS_HUB_E2E, "Playwright cockpit-reports-hub spec");

assertHotfixE2eSpecDocumentsTestids(STUDIO_HUB_E2E, STUDIO_HUB_TESTIDS, "P8-HOTFIX-B");
assertHotfixE2eSpecDocumentsTestids(REPORTS_HUB_E2E, REPORTS_HUB_TESTIDS, "P8-HOTFIX-C");

const reportsSource = readFileSync(join(repoRoot, REPORTS_HUB_E2E), "utf8");
if (!reportsSource.includes(FIXTURE_ARTIFACT_ID)) {
  fail(`${REPORTS_HUB_E2E} must reference fixture artifact id ${FIXTURE_ARTIFACT_ID}`);
}

runPriorPhases();
runHotfixPlaywright();

if (!process.exitCode) {
  console.log("[verify:hotfix-p8] OK");
  console.log(
    "[verify:hotfix-p8] Studio/reports hub Playwright enforced (ZEREF_PHASE8_PRODUCT=1, ZEREF_BFF_FIXTURE=1).",
  );
  console.log(
    "[verify:hotfix-p8] Regression: verify:phase-9 must still pass independently (CI step before this gate).",
  );
}
