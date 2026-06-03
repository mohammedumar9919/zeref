import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const webRoot = join(repoRoot, "apps/web");

// Propagate before chaining verify:phase-6 → 5.1 → 5 so nested Playwright runs reuse :3099 (CI=true).
process.env.ZEREF_PLAYWRIGHT_REUSE = "1";

const PHASE7_E2E_SPEC = "apps/web/e2e/cockpit-brain-7.spec.ts";

const C67_BRAIN_STATES = ["idle", "memory_saved", "searching", "contradiction", "entity_changed"];

const EXPECTED_PHASE7_FIXTURES = [
  "memory-entry.valid.json",
  "memory-search-result.valid.json",
  "memory-entity.valid.json",
  "memory-saved-event.valid.json",
  "cockpit-sse-outbox.valid.json",
  "mock-store.json",
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
  console.error(`[verify:phase-7] ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`[verify:phase-7] ${message}`);
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
  env.ZEREF_PLAYWRIGHT_REUSE = "1";
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

/** C67 / C70 — allow @zeref/zeref-memory server-only (BFF + cockpit helpers). */
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

/** C70 — extends C59/C30: server-only jarvis-kernel + zeref-memory; no browser memory write. */
function assertC70WebImportGuard() {
  for (const sub of ["app", "components", "lib"]) {
    for (const abs of collectWebSources(join(webRoot, sub))) {
      const rel = toRel(abs);
      const source = readFileSync(abs, "utf8");

      if (C30_INSTAGRAM_IMPORT.test(source)) {
        fail(`C70: ${rel} must not import @zeref/instagram`);
      }

      if (C30_WHISPER_IMPORT.test(source) && !isServerVoicePath(rel)) {
        fail(`C70: ${rel} must not import whisper modules outside app/api/** or lib/voice/**`);
      }

      if (C30_JARVIS_IMPORT.test(source)) {
        if (!isServerVoicePath(rel)) {
          fail(`C70: ${rel} must not import @zeref/jarvis-kernel outside app/api/** or lib/voice/**`);
        }
        if (isClientComponent(source)) {
          fail(`C70: ${rel} is a client component and must not import @zeref/jarvis-kernel`);
        }
      }

      if (C30_MEMORY_IMPORT.test(source)) {
        if (!isServerMemoryPath(rel)) {
          fail(
            `C70: ${rel} must not import @zeref/zeref-memory outside app/api/**, lib/memory/**, or lib/cockpit/**`,
          );
        }
        if (isClientComponent(source)) {
          fail(`C70: ${rel} is a client component and must not import @zeref/zeref-memory`);
        }
      }
    }
  }
}

function assertC67SpecDocumentsBrainContract() {
  const source = readFileSync(join(repoRoot, PHASE7_E2E_SPEC), "utf8");
  if (!source.includes("data-globe-brain-state")) {
    fail(`C67: ${PHASE7_E2E_SPEC} must reference data-globe-brain-state on globe-island`);
  }
  for (const state of C67_BRAIN_STATES) {
    if (!source.includes(state)) {
      fail(`C67: ${PHASE7_E2E_SPEC} must document brain state ${state}`);
    }
  }
  if (!source.includes("memory.saved")) {
    fail(`C67: ${PHASE7_E2E_SPEC} must document memory.saved SSE contract`);
  }
}

function runPriorPhases() {
  console.log("[verify:phase-7] chaining verify:phase-6 …");
  run("npm", ["run", "verify:phase-6"]);
}

function runPhase7PackageTests() {
  const env = ciSafeEnv({ ZEREF_MEMORY_MOCK: "1" });
  run("npm", ["-w", "@zeref/zeref-memory", "test"], env);
  run("npm", ["-w", "@zeref/contracts", "test"], env);
  run("npm", ["-w", "@zeref/jarvis-kernel", "test"], env);
  run("npm", ["-w", "@zeref/web", "test"], env);
}

function runPhase7BrainPlaywright() {
  const brainReady = process.env.ZEREF_PHASE7_BRAIN === "1";
  if (!brainReady) {
    fail("C67: ZEREF_PHASE7_BRAIN=1 required (Wave 4) — refusing to skip cockpit-brain-7 e2e");
    return;
  }
  const env = ciSafeEnv({
    ZEREF_PHASE7_BRAIN: "1",
    ZEREF_PHASE6_VOICE: process.env.ZEREF_PHASE6_VOICE ?? "1",
    ZEREF_PLAYWRIGHT_REUSE: "1",
  });

  run("npm", ["-w", "@zeref/web", "run", "test:e2e:install"], env);

  const res = spawnSync(
    "npm",
    ["-w", "@zeref/web", "run", "test:e2e", "--", "e2e/cockpit-brain-7.spec.ts"],
    {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env,
    },
  );

  if (res.status === 0) {
    return;
  }

  fail("C67 Playwright cockpit-brain-7.spec.ts failed (ZEREF_PHASE7_BRAIN=1)");
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

if (process.env.ZEREF_MEMORY_MOCK !== "1") {
  fail("C64: ZEREF_MEMORY_MOCK=1 required for verify:phase-7");
}

assertExists("docs/governance/phase-7-contract.md", "Phase 7 contract");

for (const adr of [
  "docs/governance/adr/ADR-025-memory-postgres-schema.md",
  "docs/governance/adr/ADR-026-kernel-memory-tools.md",
  "docs/governance/adr/ADR-027-sse-brain-events-outbox.md",
]) {
  assertExists(adr);
}

assertExists("packages/zeref-memory/package.json", "zeref-memory package");
assertExists("packages/zeref-memory/src/memory-service.ts", "memory-service");
assertExists("packages/contracts/src/phase7/index.ts", "Phase 7 contracts");
assertExists("apps/web/app/api/v1/memory/search/route.ts", "BFF memory search route");
assertExists("apps/web/lib/cockpit/cockpit-event-bus.ts", "cockpit event bus");
assertExists("apps/web/lib/memory/emit-brain-events.ts", "emit brain events");
assertExists("apps/web/lib/cockpit/outbox-drain.ts", "outbox drain");
assertExists("apps/web/test/memory-routes.test.mjs", "memory BFF unit tests");
assertExists("packages/jarvis-kernel/src/tools/memory-save.ts", "kernel memory_save");
assertExists("packages/jarvis-kernel/src/tools/memory-search.ts", "kernel memory_search");
assertExists(PHASE7_E2E_SPEC, "Playwright cockpit-brain-7 spec");

for (const fixture of EXPECTED_PHASE7_FIXTURES) {
  assertExists(`fixtures/phase-7/${fixture}`, `fixture ${fixture}`);
}

assertC67SpecDocumentsBrainContract();
assertC70WebImportGuard();

runPriorPhases();

assertExists("packages/contracts/dist/index.js", "contracts build output");
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
if (contracts.PHASE7_CONTRACT_VERSION !== "7.0.0") {
  fail("PHASE7_CONTRACT_VERSION must be 7.0.0 (C62)");
}
if (typeof contracts.MemorySavedEventSchema?.parse !== "function") {
  fail("MemorySavedEventSchema export missing (C62 / C66)");
}
if (typeof contracts.MemoryBrainEventSchema?.parse !== "function") {
  fail("MemoryBrainEventSchema export missing (C66)");
}
if (typeof contracts.CockpitSseOutboxSchema?.parse !== "function") {
  fail("CockpitSseOutboxSchema export missing (Amendment B)");
}

runPhase7PackageTests();
runPhase7BrainPlaywright();

if (!process.exitCode) {
  console.log("[verify:phase-7] OK");
}
