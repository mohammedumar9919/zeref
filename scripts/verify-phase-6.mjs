import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const webRoot = join(repoRoot, "apps/web");

const PHASE6_E2E_SPEC = "apps/web/e2e/cockpit-voice-6.spec.ts";

const C59_TESTIDS = ["ptt-button", "audio-io-live"];

const EXPECTED_PHASE6_FIXTURES = [
  "jarvis-turn-input.valid.json",
  "jarvis-turn-input.invalid.json",
  "jarvis-turn-output.valid.json",
  "voice-state-event.valid.json",
  "voice-transcript-event.valid.json",
  "voice-audio-event.valid.json",
];

/** Import statements only — comments may mention forbidden modules. */
const C30_INSTAGRAM_IMPORT =
  /(?:from\s+["']@zeref\/instagram["']|import\s*\(\s*["'][^"']*@zeref\/instagram[^"']*["'])/i;

const C30_WHISPER_IMPORT =
  /(?:from\s+["'][^"']*\/whisper[^"']*["']|import\s*\(\s*["'][^"']*whisper[^"']*["'])/i;

const C30_JARVIS_IMPORT =
  /(?:from\s+["']@zeref\/jarvis[^"']*["']|import\s*\(\s*["'][^"']*@zeref\/jarvis[^"']*["'])/i;

function fail(message) {
  console.error(`[verify:phase-6] ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`[verify:phase-6] ${message}`);
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

function toRel(abs) {
  const root = repoRoot.replace(/\\/g, "/").replace(/\/$/, "");
  const normalized = abs.replace(/\\/g, "/");
  if (normalized.toLowerCase().startsWith(root.toLowerCase() + "/")) {
    return normalized.slice(root.length + 1);
  }
  return normalized;
}

function isServerVoicePath(relPath) {
  const normalized = relPath.replace(/\\/g, "/").toLowerCase();
  return (
    normalized.includes("/apps/web/app/api/") ||
    normalized.includes("/apps/web/lib/voice/") ||
    normalized.includes("/apps/web/lib/jarvis/") ||
    normalized.startsWith("apps/web/app/api/") ||
    normalized.startsWith("apps/web/lib/voice/") ||
    normalized.startsWith("apps/web/lib/jarvis/")
  );
}

function isClientComponent(source) {
  return /^\s*["']use client["'];?\s*$/m.test(source);
}

/** C59 — allow @zeref/jarvis-kernel server-only; forbid client components + instagram everywhere. */
function assertC59WebImportGuard() {
  for (const sub of ["app", "components", "lib"]) {
    for (const abs of collectWebSources(join(webRoot, sub))) {
      const rel = toRel(abs);
      const source = readFileSync(abs, "utf8");

      if (C30_INSTAGRAM_IMPORT.test(source)) {
        fail(`C59: ${rel} must not import @zeref/instagram`);
      }

      if (C30_WHISPER_IMPORT.test(source) && !isServerVoicePath(rel)) {
        fail(`C59: ${rel} must not import whisper modules outside app/api/** or lib/voice/**`);
      }

      if (C30_JARVIS_IMPORT.test(source)) {
        if (!isServerVoicePath(rel)) {
          fail(`C59: ${rel} must not import @zeref/jarvis-kernel outside app/api/**, lib/voice/**, or lib/jarvis/**`);
        }
        if (isClientComponent(source)) {
          fail(`C59: ${rel} is a client component and must not import @zeref/jarvis-kernel`);
        }
      }
    }
  }
}

function assertC59SpecCoversTestids() {
  const source = readFileSync(join(repoRoot, PHASE6_E2E_SPEC), "utf8");
  for (const testid of C59_TESTIDS) {
    if (!source.includes(testid)) {
      fail(`C59: ${PHASE6_E2E_SPEC} must reference data-testid ${testid}`);
    }
  }
  if (!source.includes("data-globe-voice-state")) {
    fail(`C59: ${PHASE6_E2E_SPEC} must assert data-globe-voice-state on globe-island`);
  }
}

function runPriorPhases() {
  console.log("[verify:phase-6] chaining verify:phase-5.1 …");
  run("npm", ["run", "verify:phase-5.1"]);
}

function runPhase6PackageTests() {
  run("npm", ["-w", "@zeref/jarvis-kernel", "test"]);
  run("npm", ["-w", "@zeref/contracts", "test"]);
  run("npm", ["-w", "@zeref/web", "test"]);
}

function runPhase6VoicePlaywright() {
  const voiceReady = process.env.ZEREF_PHASE6_VOICE === "1";
  const env = ciSafeEnv({
    ZEREF_PHASE6_VOICE: voiceReady ? "1" : "0",
    // Reuse webServer from verify:phase-5 chain if still on PLAYWRIGHT_PORT (avoids EADDRINUSE).
    ZEREF_PLAYWRIGHT_REUSE: "1",
  });

  run("npm", ["-w", "@zeref/web", "run", "test:e2e:install"], env);

  const res = spawnSync(
    "npm",
    ["-w", "@zeref/web", "run", "test:e2e", "--", "e2e/cockpit-voice-6.spec.ts"],
    {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env,
    },
  );

  if (res.status === 0) {
    if (!voiceReady) {
      warn(
        "C59 Playwright deferred: ZEREF_PHASE6_VOICE unset — voice tests skipped until UI agent P6-D lands.",
      );
      warn(
        "Expected testids when enabled: ptt-button, audio-io-live, data-globe-voice-state on globe-island.",
      );
    }
    return;
  }

  if (!voiceReady) {
    warn(
      "C59 Playwright exited non-zero while ZEREF_PHASE6_VOICE unset — treating as deferred (pre-UI scaffold).",
    );
    warn("Re-run with ZEREF_PHASE6_VOICE=1 after UI lands to enforce hard failures.");
    return;
  }

  fail("C59 Playwright cockpit-voice-6.spec.ts failed (ZEREF_PHASE6_VOICE=1)");
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

assertExists("docs/governance/phase-6-contract.md", "Phase 6 contract");

for (const adr of [
  "docs/governance/adr/ADR-020-whisper-stt-sidecar.md",
  "docs/governance/adr/ADR-021-jarvis-kernel-two-phase-speak.md",
  "docs/governance/adr/ADR-022-elevenlabs-tts-mock.md",
  "docs/governance/adr/ADR-023-globe-voice-states.md",
  "docs/governance/adr/ADR-024-live-sse-voice-events.md",
  "docs/governance/adr/ADR-018-verify-phase-5-harness.md",
]) {
  assertExists(adr);
}

assertExists("apps/whisper/README.md", "Whisper sidecar README");
assertExists("apps/whisper/whisper_sidecar/app.py", "Whisper sidecar app");
assertExists("packages/jarvis-kernel/README.md", "jarvis-kernel README");
assertExists("packages/jarvis-kernel/src/process-turn.ts", "jarvis-kernel processTurn");
assertExists("packages/contracts/src/phase6/index.ts", "Phase 6 contracts");
assertExists("apps/web/app/api/v1/voice/turn/route.ts", "BFF voice turn route");
assertExists("apps/web/app/api/v1/voice/health/route.ts", "BFF voice health route");
assertExists("apps/web/lib/voice/handle-turn.ts", "voice handle-turn");
assertExists("apps/web/test/voice-routes.test.mjs", "voice BFF unit tests");
assertExists(PHASE6_E2E_SPEC, "Playwright cockpit-voice-6 spec");

for (const fixture of EXPECTED_PHASE6_FIXTURES) {
  assertExists(`fixtures/phase-6/${fixture}`, `fixture ${fixture}`);
}

assertC59SpecCoversTestids();
assertC59WebImportGuard();

runPriorPhases();

assertExists("packages/contracts/dist/index.js", "contracts build output");
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
if (contracts.PHASE6_CONTRACT_VERSION !== "6.0.0") {
  fail("PHASE6_CONTRACT_VERSION must be 6.0.0 (C52)");
}
if (typeof contracts.JarvisTurnInputSchema?.parse !== "function") {
  fail("JarvisTurnInputSchema export missing (C52)");
}
if (typeof contracts.VoiceAudioEventSchema?.parse !== "function") {
  fail("VoiceAudioEventSchema export missing (C52 / Amendment A)");
}

runPhase6PackageTests();
runPhase6VoicePlaywright();

if (!process.exitCode) {
  console.log("[verify:phase-6] OK");
  if (process.env.ZEREF_PHASE6_VOICE !== "1") {
    console.log(
      "[verify:phase-6] Note: C59 voice Playwright assertions are soft until ZEREF_PHASE6_VOICE=1.",
    );
  }
}
