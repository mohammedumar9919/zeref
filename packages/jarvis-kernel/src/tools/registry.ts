import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { JarvisToolRegistry, ToolContext } from "../types.js";
import { memorySave } from "./memory-save.js";
import { memorySearch } from "./memory-search.js";

export { memorySave, memorySearch };

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = join(pkgRoot, "../..");

function loadJsonFixture(relativePath: string): unknown {
  const path = join(repoRoot, relativePath);
  return JSON.parse(readFileSync(path, "utf8"));
}

export async function getCockpitSummary(
  _args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const fixturePath = ctx.cockpitFixturePath ?? "fixtures/phase-5/cockpit-slices.valid.json";
  try {
    const data = loadJsonFixture(fixturePath);
    return { available: true, summary: data };
  } catch {
    return { available: false, message: "cockpit summary unavailable" };
  }
}

export async function getLatestReportHeadline(
  _args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const fixturePath = ctx.reportFixturePath ?? "fixtures/phase-5/cockpit-slices.valid.json";
  try {
    const data = loadJsonFixture(fixturePath) as {
      panels?: { reports?: { items?: Array<{ headline?: string }> } };
    };
    const headline = data.panels?.reports?.items?.[0]?.headline;
    if (!headline) {
      return { available: false, message: "no report headline found" };
    }
    return { available: true, headline };
  } catch {
    return { available: false, message: "report headline unavailable" };
  }
}

export async function getPipelineStatus(
  _args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  if (ctx.workerAvailable === false) {
    return { available: false, status: "unavailable", message: "worker daemon absent" };
  }
  return {
    available: true,
    status: "idle",
    message: "pipeline idle — no active jobs",
  };
}

export function createDefaultToolRegistry(): JarvisToolRegistry {
  return {
    get_cockpit_summary: getCockpitSummary,
    get_latest_report_headline: getLatestReportHeadline,
    get_pipeline_status: getPipelineStatus,
    memory_save: memorySave,
    memory_search: memorySearch,
  };
}

export function selectToolsForTranscript(transcript: string): Array<{
  name: keyof JarvisToolRegistry;
  args: Record<string, unknown>;
}> {
  const lower = transcript.toLowerCase();
  const selected: Array<{
    name: keyof JarvisToolRegistry;
    args: Record<string, unknown>;
  }> = [];

  // Phase 7 (C65 / ADR-026): memory tools are slow-path only; selection here only
  // influences what runSlowPath executes, not the ack path.
  if (
    /(remember|recall|what did i say|previously|last (time|week)|earlier)/i.test(
      lower,
    )
  ) {
    selected.push({ name: "memory_search", args: {} });
  }
  if (/(remember this|remember that|save this|note this|keep in mind)/i.test(lower)) {
    selected.push({ name: "memory_save", args: {} });
  }

  if (/(cockpit|dashboard|studio|panels?)/i.test(lower)) {
    selected.push({ name: "get_cockpit_summary", args: {} });
  }
  if (/(report|headline|elite|brief)/i.test(lower)) {
    selected.push({ name: "get_latest_report_headline", args: {} });
  }
  if (/(pipeline|worker|job|queue|status)/i.test(lower)) {
    selected.push({ name: "get_pipeline_status", args: {} });
  }

  if (selected.length === 0) {
    selected.push({ name: "get_cockpit_summary", args: {} });
  }

  return selected;
}
