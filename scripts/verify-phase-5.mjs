import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const webRoot = join(repoRoot, "apps/web");

const EXPECTED_PHASE5_FIXTURES = [
  "cockpit-slices.valid.json",
  "cockpit-slices.invalid.json",
  "cockpit-slices.fixture.json",
];

const COCKPIT_RSC_PAGES = [
  "apps/web/app/cockpit/page.tsx",
  "apps/web/app/cockpit/studio/page.tsx",
  "apps/web/app/cockpit/calendar/page.tsx",
  "apps/web/app/cockpit/reports/page.tsx",
  "apps/web/app/cockpit/research/page.tsx",
];

/** Import statements only — comments may mention voice/instagram (C30). */
const C30_INSTAGRAM_IMPORT =
  /(?:from\s+["']@zeref\/instagram["']|import\s*\(\s*["'][^"']*@zeref\/instagram[^"']*["'])/i;

const C30_WHISPER_IMPORT =
  /(?:from\s+["'][^"']*\/whisper[^"']*["']|import\s*\(\s*["'][^"']*whisper[^"']*["'])/i;

const C30_JARVIS_IMPORT =
  /(?:from\s+["']@zeref\/jarvis[^"']*["']|import\s*\(\s*["'][^"']*@zeref\/jarvis[^"']*["'])/i;

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

function isClientComponent(source) {
  return /^\s*["']use client["'];?\s*$/m.test(source);
}

function fail(message) {
  console.error(`[verify:phase-5] ${message}`);
  process.exitCode = 1;
}

function assertExists(relPath, label = relPath) {
  if (!existsSync(join(repoRoot, relPath))) fail(`Missing ${label}: ${relPath}`);
}

function ciSafeEnv() {
  const env = { ...process.env };
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
  for (const sub of ["app", "components", "lib"]) {
    for (const abs of collectWebSources(join(webRoot, sub))) {
      const rel = toRel(abs);
      const source = readFileSync(abs, "utf8");

      if (C30_INSTAGRAM_IMPORT.test(source)) {
        fail(`C30: ${rel} must not import @zeref/instagram`);
      }

      if (C30_WHISPER_IMPORT.test(source) && !isServerVoicePath(rel)) {
        fail(`C30: ${rel} must not import whisper modules outside app/api/** or lib/voice/**`);
      }

      if (C30_JARVIS_IMPORT.test(source)) {
        if (!isServerVoicePath(rel)) {
          fail(`C30: ${rel} must not import @zeref/jarvis-kernel outside app/api/** or lib/voice/**`);
        }
        if (isClientComponent(source)) {
          fail(`C30: ${rel} is a client component and must not import @zeref/jarvis-kernel`);
        }
      }
    }
  }
}

function assertCockpitPagesUseRscBff() {
  const pattern = /getCockpitSlices\s*\(/;
  for (const relPath of COCKPIT_RSC_PAGES) {
    assertExists(relPath, `cockpit RSC page ${relPath}`);
    const source = readFileSync(join(repoRoot, relPath), "utf8");
    if (!/from\s+["']@\/lib\/bff["']/.test(source)) {
      fail(`C27: ${relPath} must import getCockpitSlices from @/lib/bff`);
    }
    if (!pattern.test(source)) {
      fail(`C27: ${relPath} must call getCockpitSlices() on the server`);
    }
  }
}

const [major] = process.versions.node.split(".").map(Number);
if (!Number.isFinite(major) || major < 22) {
  fail(`Node >=22 required, got ${process.versions.node}`);
}

assertExists("docs/governance/phase-5-contract.md", "Phase 5 contract");

for (const adr of [
  "docs/governance/adr/ADR-015-globe-performance.md",
  "docs/governance/adr/ADR-016-bff-cockpit-slices.md",
  "docs/governance/adr/ADR-017-cockpit-routes-layout.md",
  "docs/governance/adr/ADR-018-verify-phase-5-harness.md",
]) {
  assertExists(adr);
}

assertExists("docs/design/DESIGN_SYSTEM.md", "DESIGN_SYSTEM");
assertExists("apps/web/e2e/cockpit-layout.spec.ts", "Playwright cockpit-layout spec");
assertExists("apps/web/playwright.config.ts", "Playwright config");
assertExists("apps/web/app/api/v1/cockpit/slices/route.ts", "BFF cockpit slices route");
assertExists(
  "apps/web/app/api/v1/reports/artifacts/[id]/route.ts",
  "BFF report artifact route",
);
assertExists("apps/web/components/globe/GlobeIsland.tsx", "globe client island");

for (const fixture of EXPECTED_PHASE5_FIXTURES) {
  assertExists(`fixtures/phase-5/${fixture}`, `fixture ${fixture}`);
}

assertNoVoiceOrInstagramInWeb();
assertCockpitPagesUseRscBff();

run("npm", ["run", "build"]);

assertExists("packages/contracts/dist/index.js", "contracts build output");
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
if (contracts.PHASE5_CONTRACT_VERSION !== "5.0.0") {
  fail("PHASE5_CONTRACT_VERSION must be 5.0.0 (C24)");
}
if (typeof contracts.CockpitSlicesSchema?.parse !== "function") {
  fail("CockpitSlicesSchema export missing (C24)");
}

run("npm", ["-w", "@zeref/contracts", "test"]);
run("npm", ["-w", "@zeref/web", "test"]);
run("npm", ["-w", "@zeref/web", "run", "test:e2e:install"]);
run("npm", ["-w", "@zeref/web", "run", "test:e2e"]);

if (!process.exitCode) {
  console.log("[verify:phase-5] OK");
}
