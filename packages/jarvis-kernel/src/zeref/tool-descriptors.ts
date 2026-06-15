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
    description: "Headline from the most recent elite report artifact.",
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
    description: "Seed a new research topic for trend analysis.",
    riskTier: "write-low",
    ...writeLowBase,
  },
];

export function getZerefToolDescriptor(name: string): ToolDescriptor | undefined {
  return ZEREF_TOOL_DESCRIPTORS.find((t) => t.name === name);
}
