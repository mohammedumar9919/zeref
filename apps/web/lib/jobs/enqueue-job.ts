import { randomUUID } from "node:crypto";

import {
  AnalyzeJobInputSchema,
  CollectJobInputSchema,
  EmbedJobInputSchema,
  JarvisJobEnqueueRequestSchema,
  JarvisJobEnqueueRequestSchemaV9,
  JobEnqueueRequestSchema,
  JobEnqueueRequestSchemaV9,
  NormalizeJobInputSchema,
  ReportJobInputSchema,
  ResearchJobInputSchema,
  type JarvisJobEnqueueRequest,
  type JarvisJobEnqueueRequestV9,
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

let pgBossInstance: PgBoss | null = null;
let pgBossStartPromise: Promise<PgBoss> | null = null;

async function getPgBoss(): Promise<PgBoss> {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured for job enqueue");
  }

  if (pgBossInstance) {
    return pgBossInstance;
  }

  pgBossStartPromise ??= (async () => {
    const boss = new PgBoss({
      connectionString,
      supervise: false,
    });
    await boss.start();
    pgBossInstance = boss;
    return boss;
  })();

  return pgBossStartPromise;
}

/** Test hook — clears cached pg-boss singleton between cases. */
export function resetPgBossForTests(): void {
  pgBossInstance = null;
  pgBossStartPromise = null;
}

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

type EnqueueRequest =
  | JobEnqueueRequest
  | JobEnqueueRequestV9
  | JarvisJobEnqueueRequest
  | JarvisJobEnqueueRequestV9;

export type EnqueueJobOptions = {
  /**
   * Set only by the Jarvis write context, which runs after the kernel's
   * write-high confirm. Widens the allowlist to include `collect` (ADR-030 C2).
   */
  via?: "jarvis-confirmed";
};

function parseEnqueueRequest(rawBody: unknown, opts?: EnqueueJobOptions): EnqueueRequest {
  if (opts?.via === "jarvis-confirmed") {
    return isPhase9ResearchActive()
      ? JarvisJobEnqueueRequestSchemaV9.parse(rawBody)
      : JarvisJobEnqueueRequestSchema.parse(rawBody);
  }

  if (isPhase9ResearchActive()) {
    return JobEnqueueRequestSchemaV9.parse(rawBody);
  }

  return JobEnqueueRequestSchema.parse(rawBody);
}

const GRAPH_MEDIA_URL_BASE = "https://graph.instagram.com/v21.0";

/** Newest Graph media id for the configured account (mirrors scripts/uat-collect-recent.mjs). */
async function resolveLatestGraphMediaId(): Promise<string> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error("INSTAGRAM_ACCESS_TOKEN is not configured — collect needs live Graph credentials");
  }
  const userId = process.env.INSTAGRAM_GRAPH_USER_ID?.trim() || "me";
  const url = new URL(`${GRAPH_MEDIA_URL_BASE}/${userId}/media`);
  url.searchParams.set("fields", "id,timestamp");
  url.searchParams.set("limit", "1");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url);
  const body = (await res.json().catch(() => ({}))) as {
    data?: Array<{ id?: string }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(`Graph /media failed: ${body.error?.message ?? `HTTP ${res.status}`}`);
  }
  const id = body.data?.[0]?.id;
  if (!id) {
    throw new Error("Graph /media returned no posts to collect");
  }
  return id;
}

async function resolveCollectTarget(request: EnqueueRequest): Promise<EnqueueRequest> {
  if (request.jobType !== "collect") return request;
  if ("graphMediaId" in request && request.graphMediaId) return request;
  if ("shortcodes" in request && request.shortcodes?.length) return request;
  return { ...request, graphMediaId: await resolveLatestGraphMediaId() };
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
    case "collect": {
      const graphMediaId = "graphMediaId" in request ? request.graphMediaId : undefined;
      const shortcodes = "shortcodes" in request ? request.shortcodes : undefined;
      if (!graphMediaId && !shortcodes?.length) {
        throw validationError("graphMediaId or shortcodes is required for collect jobs");
      }
      return CollectJobInputSchema.parse({
        jobType: "collect",
        platform: "instagram",
        kind: "instagram_post_raw",
        sources: ["graph"],
        ...(shortcodes?.length ? { shortcodes } : {}),
        ...(graphMediaId ? { graphMediaId } : {}),
      });
    }
    default:
      throw validationError("unsupported job type");
  }
}

/** Shared pg-boss enqueue (Amendment I). `collect` requires `opts.via === "jarvis-confirmed"`. */
export async function enqueueJob(
  rawBody: unknown,
  opts?: EnqueueJobOptions,
): Promise<EnqueueJobResult> {
  const parsed = parseEnqueueRequest(rawBody, opts);
  const workerConsuming = isWorkerAvailable();

  if (isEnqueueMockMode()) {
    return {
      jobId: randomUUID(),
      queued: true,
      workerConsuming: false,
      mocked: true,
    };
  }

  if (!getDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured for job enqueue");
  }

  const request = await resolveCollectTarget(parsed);
  const payload = buildWorkerJobPayload(request);
  const boss = await getPgBoss();
  const jobId = await boss.send(request.jobType, payload, ENQUEUE_RETRY_OPTIONS);
  if (!jobId) {
    throw new Error("pg-boss did not return a job id");
  }

  return {
    jobId,
    queued: true,
    workerConsuming,
  };
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
