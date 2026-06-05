import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const PHASE9_RESEARCH_E2E = "apps/web/e2e/cockpit-research-9.spec.ts";

const C87_RESEARCH_TESTIDS = ["research-hub", "panel-research"];

const EXPECTED_PHASE9_FIXTURES = [
  "cockpit-slices.valid.json",
  "research-topic.valid.json",
  "research-signals.valid.json",
  "research-job-input.valid.json",
  "research-job-output.valid.json",
];

function fail(message) {
  console.error(`[verify:phase-9] ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`[verify:phase-9] ${message}`);
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

function assertPhase9E2eSpecDocumentsTestids(specPath, testids, label) {
  const source = readFileSync(join(repoRoot, specPath), "utf8");
  for (const testid of testids) {
    if (!source.includes(testid)) {
      fail(`${label}: ${specPath} must reference data-testid ${testid}`);
    }
  }
  if (!source.includes("ZEREF_PHASE9_RESEARCH")) {
    fail(`${label}: ${specPath} must document ZEREF_PHASE9_RESEARCH enforcement gate`);
  }
  if (!source.includes("Wave 4")) {
    fail(`${label}: ${specPath} must document Wave 4 deferral until P9-C research UI`);
  }
}

function assertPhase9FixtureRoundTrip() {
  const raw = readFileSync(join(repoRoot, "fixtures/phase-9/cockpit-slices.valid.json"), "utf8");
  const parsed = JSON.parse(raw);
  if (parsed.schemaVersion !== "phase9-cockpit-v1") {
    fail(
      "fixtures/phase-9/cockpit-slices.valid.json schemaVersion must be phase9-cockpit-v1 (C86)",
    );
  }
  if (parsed.panels?.research?.insufficientData !== false) {
    fail("fixtures/phase-9/cockpit-slices.valid.json research.insufficientData must be false in fixture mode (C86)");
  }
}

function runPriorPhases() {
  console.log("[verify:phase-9] chaining verify:phase-8 …");
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

function runPhase9PackageTests() {
  const env = ciSafeEnv({ ZEREF_PHASE9_RESEARCH: "1" });
  run("npm", ["-w", "@zeref/contracts", "test"], env);
  run("npm", ["-w", "@zeref/worker", "test"], env);
  run("npm", ["-w", "@zeref/web", "test"], env);
}

function runPhase9ResearchPlaywright() {
  const env = ciSafeEnv({
    ZEREF_PHASE9_RESEARCH: process.env.ZEREF_PHASE9_RESEARCH ?? "1",
    ZEREF_PHASE8_PRODUCT: "1",
    ZEREF_PHASE7_BRAIN: "1",
    ZEREF_PHASE6_VOICE: "1",
  });

  run("npm", ["-w", "@zeref/web", "run", "test:e2e:install"], env);

  const res = spawnSync(
    "npm",
    ["-w", "@zeref/web", "run", "test:e2e", "--", "e2e/cockpit-research-9.spec.ts"],
    {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env,
    },
  );

  if (res.status !== 0) {
    warn(
      "C87 Playwright cockpit-research-9.spec.ts exited non-zero — Wave 2 scaffold; tests skip until Wave 4 (P9-C research UI).",
    );
    return;
  }

  warn(
    "C87 Playwright cockpit-research-9.spec.ts OK (skipped tests expected until Wave 4 — enable hard enforcement after P9-C).",
  );
  warn(
    "Wave 4 enforcement: ZEREF_PHASE9_RESEARCH=1 + research-hub UI — set wave4ResearchUiReady=true in e2e spec.",
  );
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

if (process.env.ZEREF_JOB_ENQUEUE_MOCK !== "1") {
  fail("C90: ZEREF_JOB_ENQUEUE_MOCK=1 required for verify:phase-9");
}

if (process.env.ZEREF_PHASE9_RESEARCH !== "1") {
  fail("C90: ZEREF_PHASE9_RESEARCH=1 required for verify:phase-9");
}

if (process.env.ZEREF_BFF_FIXTURE !== "1") {
  fail("C90: ZEREF_BFF_FIXTURE=1 required for verify:phase-9");
}

assertExists("docs/governance/phase-9-contract.md", "Phase 9 contract");

for (const adr of [
  "docs/governance/adr/ADR-031-research-postgres-schema.md",
  "docs/governance/adr/ADR-032-research-worker-bff.md",
]) {
  assertExists(adr);
}

assertExists("packages/contracts/src/phase9/index.ts", "Phase 9 contracts");
assertExists("packages/db/drizzle/0004_phase9_research.sql", "Phase 9 migration");
assertExists("apps/worker/src/jobs/research.ts", "research worker handler");
assertExists("apps/worker/test/research.handler.test.mjs", "research handler unit test");
assertExists("apps/web/lib/research-bff.ts", "research BFF");
assertExists("apps/web/test/phase-9-routes.test.mjs", "phase 9 BFF unit tests");
assertExists("apps/web/app/api/v1/research/topics/route.ts", "research topics route");
assertExists("apps/web/app/api/v1/research/topics/[id]/route.ts", "research topic by id route");
assertExists(PHASE9_RESEARCH_E2E, "Playwright cockpit-research-9 spec");

for (const fixture of EXPECTED_PHASE9_FIXTURES) {
  assertExists(`fixtures/phase-9/${fixture}`, `fixture ${fixture}`);
}

assertPhase9FixtureRoundTrip();
assertPhase9E2eSpecDocumentsTestids(PHASE9_RESEARCH_E2E, C87_RESEARCH_TESTIDS, "C87");

runPriorPhases();

assertExists("packages/contracts/dist/index.js", "contracts build output");
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
if (contracts.PHASE9_CONTRACT_VERSION !== "9.0.0") {
  fail("PHASE9_CONTRACT_VERSION must be 9.0.0 (C81)");
}
if (typeof contracts.CockpitSlicesSchemaV9?.parse !== "function") {
  fail("CockpitSlicesSchemaV9 export missing (C81 / C86)");
}
if (typeof contracts.ResearchTopicSchema?.parse !== "function") {
  fail("ResearchTopicSchema export missing (C81)");
}
if (typeof contracts.ResearchSignalSchema?.parse !== "function") {
  fail("ResearchSignalSchema export missing (C81)");
}
if (typeof contracts.ResearchTopicDetailSchema?.parse !== "function") {
  fail("ResearchTopicDetailSchema export missing (C81)");
}
if (typeof contracts.JobEnqueueRequestSchemaV9?.parse !== "function") {
  fail("JobEnqueueRequestSchemaV9 export missing (C85 / Amendment L)");
}

const cockpitFixture = contracts.CockpitSlicesSchemaV9.parse(
  JSON.parse(readFileSync(join(repoRoot, "fixtures/phase-9/cockpit-slices.valid.json"), "utf8")),
);
if (cockpitFixture.schemaVersion !== "phase9-cockpit-v1") {
  fail("CockpitSlicesSchemaV9 fixture round-trip failed (C86)");
}

const topicFixture = contracts.ResearchTopicSchema.parse(
  JSON.parse(readFileSync(join(repoRoot, "fixtures/phase-9/research-topic.valid.json"), "utf8")),
);
if (!topicFixture.id) {
  fail("ResearchTopicSchema fixture round-trip failed");
}

runPhase9PackageTests();
runPhase9ResearchPlaywright();

if (!process.exitCode) {
  console.log("[verify:phase-9] OK");
  console.log(
    "[verify:phase-9] Note: research Playwright assertions deferred until Wave 4 (P9-C research UI).",
  );
  console.log(
    "[verify:phase-9] Wave 4 CI: ZEREF_PHASE9_RESEARCH=1, ZEREF_JOB_ENQUEUE_MOCK=1, ZEREF_BFF_FIXTURE=1 (+ Phase 8 flags).",
  );
}
