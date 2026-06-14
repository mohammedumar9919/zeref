/**
 * Phase 10 C122 — advisory warm `next start` timing smoke (P10-D).
 *
 * Non-blocking in verify:phase-10 (`--advisory`). Operator UAT uses prod build
 * per DEV_PERFORMANCE.md — dev cold compile is not a Phase 10 regression.
 */
import process from "node:process";

/** Documented warm /cockpit target from DEV_PERFORMANCE.md (Operator UAT). */
export const C122_TARGET_MS = 500;

/** Advisory CI slack — warn only, do not fail verify:phase-10. */
export const C122_ADVISORY_BUDGET_MS = 2000;

const advisory = process.argv.includes("--advisory");

function log(message) {
  console.log(`[perf-smoke] ${message}`);
}

function warn(message) {
  console.warn(`[perf-smoke] ${message}`);
}

async function measureWarmCockpit(baseUrl) {
  const warmUrl = `${baseUrl}/cockpit`;

  // Prime connection (ignored for budget).
  await fetch(warmUrl, { redirect: "follow" });

  const start = performance.now();
  const response = await fetch(warmUrl, { redirect: "follow" });
  const elapsedMs = Math.round(performance.now() - start);

  if (!response.ok) {
    throw new Error(`GET ${warmUrl} returned ${response.status}`);
  }

  return elapsedMs;
}

async function main() {
  const port = process.env.PLAYWRIGHT_PORT ?? process.env.PORT ?? "3099";
  const baseUrl = `http://127.0.0.1:${port}`;

  log(`C122 budget: target ${C122_TARGET_MS}ms warm /cockpit, advisory ${C122_ADVISORY_BUDGET_MS}ms`);
  log(`Measuring warm GET ${baseUrl}/cockpit …`);

  let elapsedMs;
  try {
    elapsedMs = await measureWarmCockpit(baseUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (advisory) {
      warn(`skipped — ${message} (non-blocking)`);
      return;
    }
    console.error(`[perf-smoke] ${message}`);
    process.exitCode = 1;
    return;
  }

  log(`warm /cockpit: ${elapsedMs}ms`);

  if (elapsedMs <= C122_TARGET_MS) {
    log(`within C122 target (${C122_TARGET_MS}ms)`);
    return;
  }

  if (elapsedMs <= C122_ADVISORY_BUDGET_MS) {
    warn(`above C122 target (${C122_TARGET_MS}ms) but within advisory budget (${C122_ADVISORY_BUDGET_MS}ms)`);
    if (advisory) return;
    process.exitCode = 1;
    return;
  }

  warn(`exceeded C122 advisory budget (${C122_ADVISORY_BUDGET_MS}ms)`);
  if (!advisory) {
    process.exitCode = 1;
  }
}

await main();
