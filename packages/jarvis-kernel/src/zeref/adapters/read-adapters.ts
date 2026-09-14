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

/** Own-account research outliers (CLOUD-A3). */
export async function readResearchOutliers(ctx: ZerefReadContext): Promise<unknown> {
  if (!ctx.canRead()) {
    return degraded(ctx, "get_research_outliers");
  }
  return ctx.getResearchOutliers();
}

/** Grounded weekly research brief (CLOUD-A3). */
export async function readWeeklyBrief(ctx: ZerefReadContext): Promise<unknown> {
  if (!ctx.canRead()) {
    return degraded(ctx, "get_weekly_brief");
  }
  return ctx.getWeeklyBrief();
}

/** Live Instagram Graph account snapshot (media counts + Insights when permitted). */
export async function readInstagramAccountSnapshot(ctx: ZerefReadContext): Promise<unknown> {
  if (!ctx.canRead()) {
    return degraded(ctx, "get_instagram_account_snapshot");
  }
  return ctx.getInstagramAccountSnapshot();
}

/** Own-account Meta Insights (Instagram Login). */
export async function readInstagramInsights(
  ctx: ZerefReadContext,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (!ctx.canRead()) {
    return degraded(ctx, "get_instagram_insights");
  }
  return ctx.getInstagramInsights(args);
}

/** Named competitor Business Discovery (Facebook Graph). Always delegated — helper owns FACEBOOK_* hints. */
export async function readDiscoverCompetitor(
  ctx: ZerefReadContext,
  args: Record<string, unknown>,
): Promise<unknown> {
  return ctx.discoverCompetitor(args);
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
