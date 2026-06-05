import { randomUUID } from "node:crypto";

import {
  AnalyzeJobInputSchema,
  EmbedJobInputSchema,
  JobEnqueueRequestSchema,
  JobEnqueueRequestSchemaV9,
  NormalizeJobInputSchema,
  ReportJobInputSchema,
  ResearchJobInputSchema,
  type JobEnqueueRequest,
  type JobEnqueueRequestV9,
} from "@zeref/contracts";
import PgBoss from "pg-boss";

import { resetCalendarFixtureStateForTests } from "../calendar-bff";
import { isPhase9ResearchActive } from "../cockpit-bff";
import { isWorkerAvailable } from "../cockpit/simulated-pipeline";
import { getDatabaseUrl } from "../db";
import { resetResearchFixtureStateForTests } from "../research-bff";
import { resetStudioFixtureStateForTests } from "../studio-bff";

const PHASE3_SCHEMA_VERSION = "phase3-v1";
const PHASE4_SCHEMA_VERSION = "4.0.0";

const ENQUEUE_RETRY_OPTIONS = {
  retryLimit: 3,
  retryDelay: 30,
} as const;

export type EnqueueJobResult = {
  jobId: string;
  queued: boolean;
  workerConsuming: boolean;
  mocked?: boolean;
};

export function isEnqueueMockMode(): boolean {
  return process.env.ZEREF_JOB_ENQUEUE_MOCK === "1";
}

function validationError(message: string): Error {
  return new Error(message);
}

type EnqueueRequest = JobEnqueueRequest | JobEnqueueRequestV9;

function parseEnqueueRequest(rawBody: unknown): EnqueueRequest {
  if (isPhase9ResearchActive()) {
    return JobEnqueueRequestSchemaV9.parse(rawBody);
  }

  return JobEnqueueRequestSchema.parse(rawBody);
}

/** Map UI enqueue body to worker job payload (Amendment F / L). */
export function buildWorkerJobPayload(request: EnqueueRequest): Record<string, unknown> {
  switch (request.jobType) {
    case "normalize": {
      if (!request.snapshotId) {
        throw validationError("snapshotId is required for normalize jobs");
      }
      return NormalizeJobInputSchema.parse({
        jobType: "normalize",
        snapshotId: request.snapshotId,
        schemaVersion: PHASE3_SCHEMA_VERSION,
      });
    }
    case "embed": {
      if (!request.entityId) {
        throw validationError("entityId is required for embed jobs");
      }
      return EmbedJobInputSchema.parse({
        jobType: "embed",
        normalizedEntityId: request.entityId,
        schemaVersion: PHASE3_SCHEMA_VERSION,
      });
    }
    case "analyze": {
      if (!request.entityId && !request.snapshotId) {
        throw validationError("entityId or snapshotId is required for analyze jobs");
      }
      return AnalyzeJobInputSchema.parse({
        jobType: "analyze",
        schemaVersion: PHASE4_SCHEMA_VERSION,
        normalizedEntityId: request.entityId,
        snapshotId: request.snapshotId,
      });
    }
    case "report": {
      if (!request.entityId && !request.snapshotId) {
        throw validationError("entityId or snapshotId is required for report jobs");
      }
      return ReportJobInputSchema.parse({
        jobType: "report",
        schemaVersion: PHASE4_SCHEMA_VERSION,
        normalizedEntityId: request.entityId,
        snapshotId: request.snapshotId,
      });
    }
    case "research": {
      return ResearchJobInputSchema.parse({
        jobType: "research",
        topicId: "topicId" in request ? request.topicId : undefined,
      });
    }
    default:
      throw validationError("unsupported job type");
  }
}

/** Shared pg-boss enqueue (Amendment I). */
export async function enqueueJob(rawBody: unknown): Promise<EnqueueJobResult> {
  const request = parseEnqueueRequest(rawBody);
  const workerConsuming = isWorkerAvailable();

  if (isEnqueueMockMode()) {
    return {
      jobId: randomUUID(),
      queued: true,
      workerConsuming: false,
      mocked: true,
    };
  }

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured for job enqueue");
  }

  const payload = buildWorkerJobPayload(request);
  const boss = new PgBoss(connectionString);
  await boss.start();

  try {
    const jobId = await boss.send(request.jobType, payload, ENQUEUE_RETRY_OPTIONS);
    if (!jobId) {
      throw new Error("pg-boss did not return a job id");
    }

    return {
      jobId,
      queued: true,
      workerConsuming,
    };
  } finally {
    await boss.stop();
  }
}

/** Test hook — resets in-memory phase-8 fixture stores. */
export function resetPhase8FixtureStateForTests(): void {
  resetStudioFixtureStateForTests();
  resetCalendarFixtureStateForTests();
}

/** Test hook — resets in-memory phase-9 fixture stores. */
export function resetPhase9FixtureStateForTests(): void {
  resetPhase8FixtureStateForTests();
  resetResearchFixtureStateForTests();
}
