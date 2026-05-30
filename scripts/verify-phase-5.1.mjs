import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const webRoot = join(repoRoot, "apps/web");

/** Import statements only — comments may mention voice/instagram (C30 / C50). */
const C30_FORBIDDEN_IMPORT =
  /(?:from\s+["'](?:@zeref\/instagram|@zeref\/jarvis[^"']*|[^"']*\/whisper[^"']*)["']|import\s*\(\s*["'][^"']*(?:@zeref\/instagram|whisper|jarvis)[^"']*["'])/i;

const PHASE51_E2E_SPEC = "apps/web/e2e/cockpit-hud-5.1.spec.ts";

const C48_TESTIDS = [
  "hud-header",
  "hud-footer",
  "telemetry-simulated",
  "audio-io-simulated",
];

function fail(message) {
  console.error(`[verify:phase-5.1] ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`[verify:phase-5.1] ${message}`);
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

function collectWebSources(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next" || ent.name === "e2e") {
        continue;
      }
      collectWebSources(abs, acc);
    } else if (/\.(ts|tsx)$/.test(ent.name)) {
      acc.push(abs);
    }
  }
  return acc;
}

function assertNoVoiceOrInstagramInWeb() {
  const rel = (abs) => abs.replace(/\\/g, "/").replace(`${repoRoot.replace(/\\/g, "/")}/`, "");
  for (const sub of ["app", "components", "lib"]) {
    for (const abs of collectWebSources(join(webRoot, sub))) {
      const source = readFileSync(abs, "utf8");
      if (C30_FORBIDDEN_IMPORT.test(source)) {
        fail(`C50: ${rel(abs)} must not import voice/whisper/jarvis/instagram modules`);
      }
    }
  }
}

function assertC48SpecCoversTestids() {
  const source = readFileSync(join(repoRoot, PHASE51_E2E_SPEC), "utf8");
  for (const testid of C48_TESTIDS) {
    if (!source.includes(testid)) {
      fail(`C48: ${PHASE51_E2E_SPEC} must reference data-testid ${testid}`);
    }
  }
  if (!source.includes("data-globe-mode") || !source.includes("point-cloud")) {
    fail(`C48: ${PHASE51_E2E_SPEC} must assert data-globe-mode=point-cloud`);
  }
}

function runPriorPhases() {
  for (let phase = 0; phase <= 5; phase += 1) {
    console.log(`[verify:phase-5.1] chaining verify:phase-${phase} …`);
    run("npm", ["run", `verify:phase-${phase}`]);
  }
}

/** C48 Playwright runs inside verify:phase-5 (full test:e2e). Avoid a second webServer boot on 3099. */
function assertC48PlaywrightViaPhase5Chain() {
  const uiReady = process.env.ZEREF_PHASE51_UI === "1";
  if (uiReady) {
    console.log(
      "[verify:phase-5.1] C48 Playwright enforced via verify:phase-5 chain (cockpit-hud-5.1.spec.ts + cockpit-layout C48).",
    );
    return;
  }
  warn(
    "C48 Playwright deferred: ZEREF_PHASE51_UI unset — HUD tests skipped in verify:phase-5 chain.",
  );
  warn(
    "Expected testids when enabled: hud-header, hud-footer, telemetry-simulated, audio-io-simulated, data-globe-mode=point-cloud.",
  );
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

assertExists("docs/governance/phase-5.1-contract.md", "Phase 5.1 contract");

for (const adr of [
  "docs/governance/adr/ADR-015-amendment-phase-5.1.md",
  "docs/governance/adr/ADR-019-telemetry-sse-stub.md",
  "docs/governance/adr/ADR-018-verify-phase-5-harness.md",
]) {
  assertExists(adr);
}

assertExists(PHASE51_E2E_SPEC, "Playwright cockpit-hud-5.1 spec");
assertC48SpecCoversTestids();
assertNoVoiceOrInstagramInWeb();

runPriorPhases();
assertC48PlaywrightViaPhase5Chain();

if (!process.exitCode) {
  console.log("[verify:phase-5.1] OK");
  if (process.env.ZEREF_PHASE51_UI !== "1") {
    console.log(
      "[verify:phase-5.1] Note: C48 HUD/globe Playwright assertions are soft until ZEREF_PHASE51_UI=1.",
    );
  }
}
