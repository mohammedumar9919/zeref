import type { ZerefReadContext } from "../context.js";

function degraded(ctx: ZerefReadContext, toolName: string): { available: false; message: string } {
  return { available: false, message: ctx.unavailableMessage(toolName) };
}

/** Live cockpit summary via injected context (C153). */
export async function readCockpitSummary(ctx: ZerefReadContext): Promise<unknown> {
  if (!ctx.canRead()) {
    return degraded(ctx, "get_cockpit_summary");
  }
  return ctx.loadCockpitSummary();
}

/** Latest elite report headline (C153). */
export async function readLatestReportHeadline(ctx: ZerefReadContext): Promise<unknown> {
  if (!ctx.canRead()) {
    return degraded(ctx, "get_latest_report_headline");
  }
  return ctx.getLatestReportHeadline();
}

/** Pipeline / worker queue status (C153). */
export async function readPipelineStatus(ctx: ZerefReadContext): Promise<unknown> {
  if (!ctx.canRead()) {
    return degraded(ctx, "get_pipeline_status");
  }
  return ctx.getPipelineStatus();
}

/** Elite report artifact detail (C153). */
export async function readReportArtifact(
  ctx: ZerefReadContext,
  artifactId: string,
): Promise<unknown> {
  if (!ctx.canRead()) {
    return degraded(ctx, "get_report_artifact");
  }
  return ctx.getReportArtifact(artifactId);
}

/** Worker health probe (C153). */
export async function readWorkerHealth(ctx: ZerefReadContext): Promise<unknown> {
  if (!ctx.canRead()) {
    return degraded(ctx, "get_worker_health");
  }
  return ctx.getWorkerHealth();
}

/** Memory search via MemoryPort adapter (C153). */
export async function readMemorySearch(
  ctx: ZerefReadContext,
  query: string,
  limit?: number,
): Promise<unknown> {
  if (!ctx.canRead()) {
    return degraded(ctx, "memory_search");
  }
  return ctx.memorySearch(query, limit);
}

/** Memory save via MemoryPort adapter (C153). */
export async function readMemorySave(
  ctx: ZerefReadContext,
  content: string,
  opts?: { turnId?: string; tags?: string[] },
): Promise<unknown> {
  if (!ctx.canRead()) {
    return degraded(ctx, "memory_save");
  }
  return ctx.memorySave(content, opts);
}
