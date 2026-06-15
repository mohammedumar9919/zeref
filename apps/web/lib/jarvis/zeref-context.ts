import {
  FIXTURE_ARTIFACT_ID,
  getReportArtifact,
  loadCockpitSlices,
} from "../cockpit-bff";
import { createCalendarEvent } from "../calendar-bff";
import { getDb, isFixtureMode } from "../db";
import { enqueueJob } from "../jobs/enqueue-job";
import { probeWorkerHealth, resolveWorkerHealth } from "../ops/worker-health";
import { createResearchTopic } from "../research-bff";
import { isWorkerAvailable } from "../cockpit/simulated-pipeline";
import { upsertStudioDraft } from "../studio-bff";
import type { ZerefContext } from "@zeref/jarvis-kernel";
import { createWebMemoryPort } from "./memory-port";

function unavailableMessage(toolName: string): string {
  return `${toolName} unavailable — database not configured and fixture mode is off (C158).`;
}

function summarizeCockpit(slices: Awaited<ReturnType<typeof loadCockpitSlices>>): unknown {
  return {
    available: true,
    schemaVersion: slices.schemaVersion,
    panels: {
      studio: {
        itemCount: slices.panels.studio.items.length,
        insufficientData: slices.panels.studio.insufficientData,
      },
      calendar: {
        itemCount: slices.panels.calendar.items.length,
        insufficientData: slices.panels.calendar.insufficientData,
      },
      reports: {
        itemCount: slices.panels.reports.items.length,
        insufficientData: slices.panels.reports.insufficientData,
      },
      research: {
        itemCount: slices.panels.research.items.length,
        insufficientData: slices.panels.research.insufficientData,
      },
    },
  };
}

/** Wires kernel ZerefContext to live BFF functions (C153–C154). */
export function createZerefContext(turnId?: string): ZerefContext {
  const memory = createWebMemoryPort();

  return {
    read: {
      canRead(): boolean {
        return isFixtureMode() || Boolean(getDb());
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
        return { available: true, headline };
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
    },
  };
}

export { FIXTURE_ARTIFACT_ID };
