import type { ToolExecutionResult, ToolExecutorPort } from "../core/ports/tool-executor-port.js";
import {
  readCockpitSummary,
  readLatestReportHeadline,
  readMemorySave,
  readMemorySearch,
  readPipelineStatus,
  readReportArtifact,
  readWorkerHealth,
} from "./adapters/read-adapters.js";
import type { IdempotencyCache } from "./adapters/write-adapters.js";
import {
  writeCreateCalendarEvent,
  writeCreateResearchTopic,
  writeEnqueueJob,
  writeUpdateStudioDraft,
} from "./adapters/write-adapters.js";
import type { ZerefContext } from "./context.js";

function ok(data: unknown, auditMeta?: Record<string, unknown>): ToolExecutionResult {
  return { ok: true, data, auditMeta };
}

function fail(error: string): ToolExecutionResult {
  return { ok: false, error };
}

/** ToolExecutorPort implementation delegating to injected ZerefContext (C144, C153–C154). */
export function createZerefToolExecutor(
  ctx: ZerefContext,
  opts?: { idempotencyCache?: IdempotencyCache },
): ToolExecutorPort {
  const cache = opts?.idempotencyCache ?? new Map<string, unknown>();

  return {
    async execute(name, args): Promise<ToolExecutionResult> {
      try {
        switch (name) {
          case "get_cockpit_summary":
            return ok(await readCockpitSummary(ctx.read));
          case "get_latest_report_headline":
            return ok(await readLatestReportHeadline(ctx.read));
          case "get_pipeline_status":
            return ok(await readPipelineStatus(ctx.read));
          case "get_report_artifact": {
            const artifactId =
              typeof args.artifactId === "string" ? args.artifactId : "";
            return ok(await readReportArtifact(ctx.read, artifactId));
          }
          case "get_worker_health":
            return ok(await readWorkerHealth(ctx.read));
          case "memory_search": {
            const query = typeof args.query === "string" ? args.query : "";
            const limit = typeof args.limit === "number" ? args.limit : undefined;
            return ok(await readMemorySearch(ctx.read, query, limit));
          }
          case "memory_save": {
            const content =
              typeof args.content === "string"
                ? args.content
                : typeof args.summaryText === "string"
                  ? args.summaryText
                  : "";
            const turnId = typeof args.turnId === "string" ? args.turnId : undefined;
            const tags = Array.isArray(args.tags)
              ? args.tags.filter((t): t is string => typeof t === "string")
              : undefined;
            return ok(await readMemorySave(ctx.read, content, { turnId, tags }));
          }
          case "enqueue_job": {
            const data = await writeEnqueueJob(ctx.write, args, cache);
            const mocked =
              data !== null &&
              typeof data === "object" &&
              "mocked" in data &&
              (data as { mocked?: boolean }).mocked === true;
            return ok(data, { simulated: mocked });
          }
          case "create_calendar_event":
            return ok(await writeCreateCalendarEvent(ctx.write, args, cache));
          case "update_studio_draft":
            return ok(await writeUpdateStudioDraft(ctx.write, args, cache));
          case "create_research_topic":
            return ok(await writeCreateResearchTopic(ctx.write, args, cache));
          default:
            return fail(`unknown tool: ${name}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return fail(message);
      }
    },
  };
}
