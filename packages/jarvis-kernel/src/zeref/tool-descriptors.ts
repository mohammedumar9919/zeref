import { ToolInputSchema, type ToolDescriptor } from "../core/tool-descriptor.js";

const readBase = {
  inputSchema: ToolInputSchema,
  idempotent: true,
  costHint: "cheap" as const,
};

const writeLowBase = {
  inputSchema: ToolInputSchema,
  idempotent: true,
  costHint: "moderate" as const,
};

const writeHighBase = {
  inputSchema: ToolInputSchema,
  idempotent: true,
  costHint: "moderate" as const,
};

/** All Phase 11 MCP-style tool descriptors (C143, C149). */
export const ZEREF_TOOL_DESCRIPTORS: ToolDescriptor[] = [
  {
    name: "get_cockpit_summary",
    description: "Live cockpit panel summary (studio, calendar, reports, research).",
    riskTier: "read",
    ...readBase,
  },
  {
    name: "get_latest_report_headline",
    description:
      "Read the headline of an ALREADY-SAVED elite report. Do NOT use this when the operator asks to make, generate, or refresh a report — use request_performance_report instead.",
    riskTier: "read",
    ...readBase,
  },
  {
    name: "get_pipeline_status",
    description: "Pipeline / job queue status when worker is available.",
    riskTier: "read",
    ...readBase,
  },
  {
    name: "get_report_artifact",
    description: "Full elite report artifact by artifact id.",
    riskTier: "read",
    ...readBase,
  },
  {
    name: "get_worker_health",
    description: "pg-boss worker consumption health probe.",
    riskTier: "read",
    ...readBase,
  },
  {
    name: "memory_save",
    description: "Persist episodic memory from the current conversation.",
    riskTier: "read",
    ...readBase,
  },
  {
    name: "memory_search",
    description: "Search episodic memory for prior context.",
    riskTier: "read",
    ...readBase,
  },
  {
    name: "enqueue_job",
    description: "Enqueue a background pipeline job (normalize, embed, analyze, report, research).",
    riskTier: "write-high",
    ...writeHighBase,
  },
  {
    name: "create_calendar_event",
    description: "Schedule a calendar event linked to pipeline work.",
    riskTier: "write-high",
    ...writeHighBase,
  },
  {
    name: "update_studio_draft",
    description: "Upsert studio draft overlay for a normalized entity.",
    riskTier: "write-low",
    ...writeLowBase,
  },
  {
    name: "create_research_topic",
    description:
      "Seed a new OWN-ACCOUNT research topic. Args: { title: string, scopeEntityId?: uuid }. Not for market-wide viral discovery.",
    riskTier: "write-low",
    ...writeLowBase,
  },
  {
    name: "get_research_outliers",
    description:
      "Own-account posts at 5× median engagement only. Empty when few posts exist. Not market viral trends.",
    riskTier: "read",
    ...readBase,
  },
  {
    name: "get_weekly_brief",
    description:
      "Grounded weekly brief from own-account outliers/hooks. Not external Instagram/Facebook trend research.",
    riskTier: "read",
    ...readBase,
  },
  {
    name: "get_instagram_account_snapshot",
    description:
      "Live connected Instagram account snapshot via Graph: username, media counts by type, recent posts, and Insights when the token has instagram_business_manage_insights (views/reach/interactions). Not competitor Business Discovery.",
    riskTier: "read",
    ...readBase,
  },
  {
    name: "get_instagram_insights",
    description:
      "Own-account Meta Insights via Instagram Login. Args: { includeAccount?: boolean, mediaIds?: string[] }. Returns views/reach/profile_views/interactions. Requires instagram_business_manage_insights. Not Facebook Page Insights and not other creators.",
    riskTier: "read",
    ...readBase,
  },
  {
    name: "research_external_trends",
    description:
      "External social trend research across Instagram, Facebook, TikTok, YouTube, etc. Args: { query: string, platforms?: string[], regions?: string[], lookbackDays?: number }. Returns web-intel (not Meta Graph Insights). Always disclose source.",
    riskTier: "write-low",
    ...writeLowBase,
  },
  {
    name: "request_performance_report",
    description:
      "Queue a NEW elite performance report for the latest studio entity (or args.entityId). Use when the operator asks to make/generate a report on current account performance. Does not reuse an old headline.",
    riskTier: "write-low",
    ...writeLowBase,
  },
];

export function getZerefToolDescriptor(name: string): ToolDescriptor | undefined {
  return ZEREF_TOOL_DESCRIPTORS.find((t) => t.name === name);
}
