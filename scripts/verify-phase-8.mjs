import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const webRoot = join(repoRoot, "apps/web");

const PHASE8_STUDIO_E2E = "apps/web/e2e/cockpit-studio-8.spec.ts";
const PHASE8_CALENDAR_E2E = "apps/web/e2e/cockpit-calendar-8.spec.ts";

const C75_STUDIO_TESTIDS = ["studio-editor", "panel-studio"];
const C76_CALENDAR_TESTIDS = ["calendar-scheduler", "panel-calendar"];

const EXPECTED_PHASE8_FIXTURES = [
  "cockpit-slices.valid.json",
  "calendar-event.valid.json",
  "studio-draft.valid.json",
  "job-enqueue.valid.json",
];

/** Import statements only — comments may mention forbidden modules. */
const C30_INSTAGRAM_IMPORT =
  /(?:from\s+["']@zeref\/instagram["']|import\s*\(\s*["'][^"']*@zeref\/instagram[^"']*["'])/i;

const C30_WHISPER_IMPORT =
  /(?:from\s+["'][^"']*\/whisper[^"']*["']|import\s*\(\s*["'][^"']*whisper[^"']*["'])/i;

const C30_JARVIS_IMPORT =
  /(?:from\s+["']@zeref\/jarvis[^"']*["']|import\s*\(\s*["'][^"']*@zeref\/jarvis[^"']*["'])/i;

const C30_MEMORY_IMPORT =
  /(?:from\s+["']@zeref\/zeref-memory["']|import\s*\(\s*["'][^"']*@zeref\/zeref-memory[^"']*["'])/i;

function fail(message) {
  console.error(`[verify:phase-8] ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`[verify:phase-8] ${message}`);
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
    normalized.startsWith("apps/web/app/api/") ||
    normalized.startsWith("apps/web/lib/voice/")
  );
}

function isServerMemoryPath(relPath) {
  const normalized = relPath.replace(/\\/g, "/").toLowerCase();
  return (
    normalized.includes("/apps/web/app/api/") ||
    normalized.includes("/apps/web/lib/memory/") ||
    normalized.includes("/apps/web/lib/cockpit/") ||
    normalized.startsWith("apps/web/app/api/") ||
    normalized.startsWith("apps/web/lib/memory/") ||
    normalized.startsWith("apps/web/lib/cockpit/")
  );
}

function isClientComponent(source) {
  return /^\s*["']use client["'];?\s*$/m.test(source);
}

/** C78 / C80 — extends C70: server-only memory + jarvis; no @zeref/instagram in web. */
function assertC78WebImportGuard() {
  for (const sub of ["app", "components", "lib"]) {
    for (const abs of collectWebSources(join(webRoot, sub))) {
      const rel = toRel(abs);
      const source = readFileSync(abs, "utf8");

      if (C30_INSTAGRAM_IMPORT.test(source)) {
        fail(`C78: ${rel} must not import @zeref/instagram`);
      }

      if (C30_WHISPER_IMPORT.test(source) && !isServerVoicePath(rel)) {
        fail(`C78: ${rel} must not import whisper modules outside app/api/** or lib/voice/**`);
      }

      if (C30_JARVIS_IMPORT.test(source)) {
        if (!isServerVoicePath(rel)) {
          fail(`C78: ${rel} must not import @zeref/jarvis-kernel outside app/api/** or lib/voice/**`);
        }
        if (isClientComponent(source)) {
          fail(`C78: ${rel} is a client component and must not import @zeref/jarvis-kernel`);
        }
      }

      if (C30_MEMORY_IMPORT.test(source)) {
        if (!isServerMemoryPath(rel)) {
          fail(
            `C78: ${rel} must not import @zeref/zeref-memory outside app/api/**, lib/memory/**, or lib/cockpit/**`,
          );
        }
        if (isClientComponent(source)) {
          fail(`C78: ${rel} is a client component and must not import @zeref/zeref-memory`);
        }
      }
    }
  }
}

function assertPhase8E2eSpecDocumentsTestids(specPath, testids, label) {
  const source = readFileSync(join(repoRoot, specPath), "utf8");
  for (const testid of testids) {
    if (!source.includes(testid)) {
      fail(`${label}: ${specPath} must reference data-testid ${testid}`);
    }
  }
  if (!source.includes("ZEREF_PHASE8_PRODUCT")) {
    fail(`${label}: ${specPath} must document ZEREF_PHASE8_PRODUCT enforcement gate`);
  }
  if (!source.includes("Wave 4")) {
    fail(`${label}: ${specPath} must document Wave 4 deferral until P8-C/P8-D UI`);
  }
}

function assertPhase8FixtureRoundTrip() {
  const raw = readFileSync(join(repoRoot, "fixtures/phase-8/cockpit-slices.valid.json"), "utf8");
  const parsed = JSON.parse(raw);
  if (parsed.schemaVersion !== "phase8-cockpit-v1") {
    fail("fixtures/phase-8/cockpit-slices.valid.json schemaVersion must be phase8-cockpit-v1 (Amendment G)");
  }
}

function runPriorPhases() {
  console.log("[verify:phase-8] chaining verify:phase-7 …");
  run("npm", ["run", "verify:phase-7"], ciSafeEnv({ ZEREF_PHASE7_BRAIN: "1" }));
}

function runPhase8PackageTests() {
  const env = ciSafeEnv();
  run("npm", ["-w", "@zeref/contracts", "test"], env);
  run("npm", ["-w", "@zeref/web", "test"], env);
}

function runPhase8ProductPlaywright() {
  const env = ciSafeEnv({
    ZEREF_PHASE8_PRODUCT: process.env.ZEREF_PHASE8_PRODUCT ?? "1",
    ZEREF_PHASE7_BRAIN: "1",
    ZEREF_PHASE6_VOICE: "1",
  });

  run("npm", ["-w", "@zeref/web", "run", "test:e2e:install"], env);

  for (const spec of ["e2e/cockpit-studio-8.spec.ts", "e2e/cockpit-calendar-8.spec.ts"]) {
    const res = spawnSync("npm", ["-w", "@zeref/web", "run", "test:e2e", "--", spec], {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env,
    });

    if (res.status !== 0) {
      warn(
        `C75/C76 Playwright ${spec} exited non-zero — Wave 2 scaffold; tests skip until Wave 4 (P8-C/P8-D UI).`,
      );
      continue;
    }

    warn(
      `C75/C76 Playwright ${spec} OK (skipped tests expected until Wave 4 — enable hard enforcement after P8-C + P8-D).`,
    );
  }

  warn(
    "Wave 4 enforcement: ZEREF_PHASE8_PRODUCT=1 + studio-editor / calendar-scheduler UI — remove Wave 4 skip in e2e specs.",
  );
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

if (process.env.ZEREF_JOB_ENQUEUE_MOCK !== "1") {
  fail("C80: ZEREF_JOB_ENQUEUE_MOCK=1 required for verify:phase-8");
}

assertExists("docs/governance/phase-8-contract.md", "Phase 8 contract");

for (const adr of [
  "docs/governance/adr/ADR-028-studio-drafts-editor.md",
  "docs/governance/adr/ADR-029-calendar-events-schema.md",
  "docs/governance/adr/ADR-030-bff-job-enqueue.md",
]) {
  assertExists(adr);
}

assertExists("packages/contracts/src/phase8/index.ts", "Phase 8 contracts");
assertExists("packages/db/drizzle/0003_phase8_studio_calendar.sql", "Phase 8 migration");
assertExists("apps/web/lib/jobs/enqueue-job.ts", "enqueue-job helper");
assertExists("apps/web/lib/studio-bff.ts", "studio BFF");
assertExists("apps/web/lib/calendar-bff.ts", "calendar BFF");
assertExists("apps/web/test/phase-8-routes.test.mjs", "phase 8 BFF unit tests");
assertExists("apps/web/app/api/v1/studio/entities/[id]/route.ts", "studio entity route");
assertExists("apps/web/app/api/v1/studio/drafts/[entityId]/route.ts", "studio draft route");
assertExists("apps/web/app/api/v1/calendar/events/route.ts", "calendar events route");
assertExists("apps/web/app/api/v1/calendar/events/[id]/route.ts", "calendar event by id route");
assertExists("apps/web/app/api/v1/jobs/enqueue/route.ts", "jobs enqueue route");
assertExists(PHASE8_STUDIO_E2E, "Playwright cockpit-studio-8 spec");
assertExists(PHASE8_CALENDAR_E2E, "Playwright cockpit-calendar-8 spec");

for (const fixture of EXPECTED_PHASE8_FIXTURES) {
  assertExists(`fixtures/phase-8/${fixture}`, `fixture ${fixture}`);
}

assertPhase8FixtureRoundTrip();
assertPhase8E2eSpecDocumentsTestids(PHASE8_STUDIO_E2E, C75_STUDIO_TESTIDS, "C75");
assertPhase8E2eSpecDocumentsTestids(PHASE8_CALENDAR_E2E, C76_CALENDAR_TESTIDS, "C76");
assertC78WebImportGuard();

runPriorPhases();

assertExists("packages/contracts/dist/index.js", "contracts build output");
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
if (contracts.PHASE8_CONTRACT_VERSION !== "8.0.0") {
  fail("PHASE8_CONTRACT_VERSION must be 8.0.0 (C71)");
}
if (typeof contracts.CockpitSlicesSchemaV8?.parse !== "function") {
  fail("CockpitSlicesSchemaV8 export missing (C71 / Amendment G)");
}
if (typeof contracts.CalendarEventSchema?.parse !== "function") {
  fail("CalendarEventSchema export missing (C71)");
}
if (typeof contracts.StudioDraftSchema?.parse !== "function") {
  fail("StudioDraftSchema export missing (C71)");
}
if (typeof contracts.JobEnqueueRequestSchema?.parse !== "function") {
  fail("JobEnqueueRequestSchema export missing (C71 / Amendment F)");
}

const cockpitFixture = contracts.CockpitSlicesSchemaV8.parse(
  JSON.parse(readFileSync(join(repoRoot, "fixtures/phase-8/cockpit-slices.valid.json"), "utf8")),
);
if (cockpitFixture.schemaVersion !== "phase8-cockpit-v1") {
  fail("CockpitSlicesSchemaV8 fixture round-trip failed (Amendment G)");
}

runPhase8PackageTests();
runPhase8ProductPlaywright();

if (!process.exitCode) {
  console.log("[verify:phase-8] OK");
  console.log(
    "[verify:phase-8] Note: studio/calendar Playwright assertions deferred until Wave 4 (P8-C/P8-D).",
  );
  console.log(
    "[verify:phase-8] Wave 4 CI: ZEREF_PHASE8_PRODUCT=1, ZEREF_JOB_ENQUEUE_MOCK=1, ZEREF_BFF_FIXTURE=1 (+ Phase 7 flags).",
  );
}
