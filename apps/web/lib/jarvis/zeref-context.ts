import {
  FIXTURE_ARTIFACT_ID,
  getReportArtifact,
  loadCockpitSlices,
} from "../cockpit-bff";
import { createCalendarEvent } from "../calendar-bff";
import { getDb, isFixtureMode } from "../db";
import { enqueueJob } from "../jobs/enqueue-job";
import { probeWorkerHealth, resolveWorkerHealth } from "../ops/worker-health";
import { createResearchTopic, getResearchIntel } from "../research-bff";
import { isWorkerAvailable } from "../cockpit/simulated-pipeline";
import { upsertStudioDraft } from "../studio-bff";
import type { ZerefContext } from "@zeref/jarvis-kernel";
import { createWebMemoryPort } from "./memory-port";
import { aggregatePanelDataAgeState, type DataAgeState } from "../data-age";
import { loadInstagramAccountSnapshot, loadInstagramInsights } from "./instagram-snapshot";
import { runExternalSocialResearch } from "./external-research";
import { loadCompetitorDiscovery, loadReelIdeas } from "./competitor-discovery";

function unavailableMessage(toolName: string): string {
  return `${toolName} unavailable — database not configured and fixture mode is off (C158).`;
}

function summarizeCockpit(slices: Awaited<ReturnType<typeof loadCockpitSlices>>): unknown {
  const panels = slices.panels;
  const panelStates: Array<{ dataAgeState?: DataAgeState }> = [
    panels.studio,
    panels.calendar,
    panels.reports,
    panels.research,
  ];

  return {
    available: true,
    schemaVersion: slices.schemaVersion,
    panels: {
      studio: {
        itemCount: slices.panels.studio.items.length,
        insufficientData: slices.panels.studio.insufficientData,
        dataAgeState: "dataAgeState" in slices.panels.studio ? slices.panels.studio.dataAgeState : undefined,
        latestEntityId: slices.panels.studio.items[0]?.entityId,
      },
      calendar: {
        itemCount: slices.panels.calendar.items.length,
        insufficientData: slices.panels.calendar.insufficientData,
        dataAgeState:
          "dataAgeState" in slices.panels.calendar ? slices.panels.calendar.dataAgeState : undefined,
      },
      reports: {
        itemCount: slices.panels.reports.items.length,
        insufficientData: slices.panels.reports.insufficientData,
        dataAgeState: "dataAgeState" in slices.panels.reports ? slices.panels.reports.dataAgeState : undefined,
        latestHeadline: slices.panels.reports.items[0]?.headline,
      },
      research: {
        itemCount: slices.panels.research.items.length,
        insufficientData: slices.panels.research.insufficientData,
        dataAgeState:
          "dataAgeState" in slices.panels.research ? slices.panels.research.dataAgeState : undefined,
      },
    },
    freshness: {
      overallDataAgeState: aggregatePanelDataAgeState(panelStates),
    },
  };
}

async function resolveLatestStudioEntityId(): Promise<string | undefined> {
  const slices = await loadCockpitSlices();
  return slices.panels.studio.items[0]?.entityId;
}

/** Wires kernel ZerefContext to live BFF functions (C153–C154). */
export function createZerefContext(turnId?: string): ZerefContext {
  const memory = createWebMemoryPort();

  return {
    read: {
      canRead(): boolean {
        return isFixtureMode() || Boolean(getDb()) || Boolean(process.env.INSTAGRAM_ACCESS_TOKEN) || Boolean(process.env.FACEBOOK_ACCESS_TOKEN);
      },
      unavailableMessage,
      async loadCockpitSummary() {
        const slices = await loadCockpitSlices();
        return summarizeCockpit(slices);
      },
      async getLatestReportHeadline() {
        const slices = await loadCockpitSlices();
        const headline = slices.panels.reports.items[0]?.headline;
        if (!headline) {
          return { available: false, message: "no report headline found" };
        }
        return {
          available: true,
          headline,
          note: "Existing saved report only — call request_performance_report to generate a new one.",
        };
      },
      async getPipelineStatus() {
        if (!isWorkerAvailable() && !isFixtureMode()) {
          return {
            available: false,
            status: "unavailable",
            message: "worker daemon absent — start worker before enqueueing jobs",
          };
        }
        const health = await probeWorkerHealth();
        return {
          available: true,
          status: health.consuming ? "active" : "idle",
          workerConsuming: health.consuming,
          source: health.source,
          message: health.consuming
            ? "pipeline worker is consuming jobs"
            : "pipeline idle — no active jobs",
        };
      },
      async getReportArtifact(artifactId: string) {
        const result = await getReportArtifact(artifactId);
        if (result.status !== 200) {
          return { available: false, message: result.body.error };
        }
        return { available: true, artifactId, report: result.body };
      },
      async getWorkerHealth() {
        if (!isFixtureMode() && !getDb()) {
          return { available: false, message: unavailableMessage("get_worker_health") };
        }
        const health = isFixtureMode() ? resolveWorkerHealth() : await probeWorkerHealth();
        return { available: true, ...health };
      },
      async memorySearch(query, limit) {
        const results = await memory.search(query, { limit });
        return { available: true, results };
      },
      async memorySave(content, opts) {
        const saved = await memory.save(content, {
          tags: opts?.tags,
        });
        return {
          available: true,
          entryId: saved.id,
          turnId: opts?.turnId ?? turnId,
        };
      },
      async getResearchOutliers() {
        const result = await getResearchIntel();
        if (result.status !== 200) {
          const message =
            "error" in result.body ? result.body.error : "research intel unavailable";
          return { available: false, message };
        }
        return {
          available: true,
          outliers: result.body.outliers,
          competitor: result.body.competitor,
        };
      },
      async getWeeklyBrief() {
        const result = await getResearchIntel();
        if (result.status !== 200) {
          const message =
            "error" in result.body ? result.body.error : "research intel unavailable";
          return { available: false, message };
        }
        if (!result.body.weeklyBrief) {
          return { available: false, message: "no weekly brief computed" };
        }
        return { available: true, brief: result.body.weeklyBrief, hooks: result.body.hooks };
      },
      async getInstagramAccountSnapshot() {
        return loadInstagramAccountSnapshot();
      },
      async getInstagramInsights(args) {
        return loadInstagramInsights(args);
      },
      async discoverCompetitor(args) {
        return loadCompetitorDiscovery(args);
      },
    },
    write: {
      async enqueueJob(body, _idempotencyKey) {
        return enqueueJob(body);
      },
      async createCalendarEvent(body, _idempotencyKey) {
        const result = await createCalendarEvent(body);
        if (result.status !== 201 && result.status !== 200) {
          throw new Error(result.body.error);
        }
        return result.body;
      },
      async updateStudioDraft(entityId, body, _idempotencyKey) {
        const result = await upsertStudioDraft(entityId, body);
        if (result.status !== 200) {
          throw new Error(result.body.error);
        }
        return result.body;
      },
      async createResearchTopic(body, _idempotencyKey) {
        const result = await createResearchTopic(body);
        if (result.status !== 201 && result.status !== 200) {
          throw new Error(result.body.error);
        }
        return result.body;
      },
      async researchExternalTrends(args) {
        return runExternalSocialResearch(args);
      },
      async suggestReelIdeas(args) {
        return loadReelIdeas(args);
      },
      async requestPerformanceReport(args) {
        const entityId =
          typeof args.entityId === "string" && args.entityId.trim()
            ? args.entityId.trim()
            : await resolveLatestStudioEntityId();
        if (!entityId) {
          return {
            available: false,
            queued: false,
            message:
              "No studio entity available to report on — collect Instagram media into the pipeline first.",
          };
        }
        const enqueued = await enqueueJob({
          jobType: "report",
          entityId,
        });
        return {
          available: true,
          queued: enqueued.queued,
          jobId: enqueued.jobId,
          workerConsuming: enqueued.workerConsuming,
          entityId,
          message:
            "Fresh performance report job queued. Existing headlines stay until the worker finishes the new artifact.",
        };
      },
    },
  };
}

export { FIXTURE_ARTIFACT_ID };
