import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import {
  NormalizedEntityIdSchema,
  ResearchIntelSchema,
  ResearchSignalSchema,
  ResearchTopicDetailSchema,
  ResearchTopicIdSchema,
  ResearchTopicSchema,
  type ResearchIntel,
  type ResearchSignal,
  type ResearchTopic,
  type ResearchTopicDetail,
} from "@zeref/contracts";
import { researchSignals, researchTopics } from "@zeref/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, isFixtureMode } from "./db";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const phase9FixturesRoot = join(repoRoot, "fixtures/phase-9");
const cloudA3FixturesRoot = join(repoRoot, "fixtures/cloud-a3");

export const ResearchTopicCreateSchema = z
  .object({
    title: z.string().min(1),
    scopeEntityId: NormalizedEntityIdSchema.optional(),
  })
  .strict();

export type BffResult<T> =
  | { status: 200; body: T }
  | { status: 201; body: T }
  | { status: 404; body: { error: string } }
  | { status: 400; body: { error: string } }
  | { status: 500; body: { error: string } };

function loadPhase9Fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(phase9FixturesRoot, name), "utf8"));
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function rowToResearchTopic(row: {
  id: string;
  title: string;
  scopeEntityId: string | null;
  trendScore: string | null;
  signalCount: number;
  lastComputedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ResearchTopic {
  return ResearchTopicSchema.parse({
    id: row.id,
    title: row.title,
    scopeEntityId: row.scopeEntityId ?? undefined,
    trendScore: row.trendScore != null ? Number(row.trendScore) : undefined,
    signalCount: row.signalCount,
    lastComputedAt: row.lastComputedAt ? toIsoString(row.lastComputedAt) : undefined,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  });
}

function rowToResearchSignal(row: {
  id: string;
  topicId: string;
  sourceEntityId: string | null;
  sourceSnapshotId: string | null;
  signalType: string;
  score: string;
  payloadJson: Record<string, unknown>;
  computedAt: Date | string;
}): ResearchSignal {
  return ResearchSignalSchema.parse({
    id: row.id,
    topicId: row.topicId,
    sourceEntityId: row.sourceEntityId ?? undefined,
    sourceSnapshotId: row.sourceSnapshotId ?? undefined,
    signalType: row.signalType,
    score: Number(row.score),
    payloadJson: row.payloadJson ?? {},
    computedAt: toIsoString(row.computedAt),
  });
}

let fixtureTopics: ResearchTopic[] | null = null;
let fixtureSignals: ResearchSignal[] | null = null;

function ensureFixtureTopics(): ResearchTopic[] {
  if (!fixtureTopics) {
    fixtureTopics = [ResearchTopicSchema.parse(loadPhase9Fixture("research-topic.valid.json"))];
  }
  return fixtureTopics;
}

function ensureFixtureSignals(): ResearchSignal[] {
  if (!fixtureSignals) {
    const raw = loadPhase9Fixture("research-signals.valid.json") as unknown[];
    fixtureSignals = raw.map((item) => ResearchSignalSchema.parse(item));
  }
  return fixtureSignals;
}

/** Test hook — resets in-memory phase-9 research fixtures. */
export function resetResearchFixtureStateForTests(): void {
  fixtureTopics = null;
  fixtureSignals = null;
}

function listResearchTopicsFixture(): BffResult<{ topics: ResearchTopic[] }> {
  return { status: 200, body: { topics: [...ensureFixtureTopics()] } };
}

async function listResearchTopicsFromDb(): Promise<BffResult<{ topics: ResearchTopic[] }>> {
  const db = getDb();
  if (!db) {
    return { status: 500, body: { error: "database not configured" } };
  }

  const rows = await db
    .select()
    .from(researchTopics)
    .orderBy(desc(researchTopics.updatedAt));

  return {
    status: 200,
    body: { topics: rows.map((row) => rowToResearchTopic(row)) },
  };
}

/** GET research topics list (C84 / ADR-032). */
export async function listResearchTopics(): Promise<BffResult<{ topics: ResearchTopic[] }>> {
  if (isFixtureMode()) {
    return listResearchTopicsFixture();
  }

  return listResearchTopicsFromDb();
}

function getResearchTopicFixture(topicId: string): BffResult<ResearchTopicDetail> {
  const parsedId = ResearchTopicIdSchema.safeParse(topicId);
  if (!parsedId.success) {
    return { status: 404, body: { error: "research topic not found" } };
  }

  const topic = ensureFixtureTopics().find((item) => item.id === parsedId.data);
  if (!topic) {
    return { status: 404, body: { error: "research topic not found" } };
  }

  const signals = ensureFixtureSignals().filter((signal) => signal.topicId === parsedId.data);
  const detail = ResearchTopicDetailSchema.parse({ topic, signals });
  return { status: 200, body: detail };
}

async function getResearchTopicFromDb(topicId: string): Promise<BffResult<ResearchTopicDetail>> {
  const parsedId = ResearchTopicIdSchema.safeParse(topicId);
  if (!parsedId.success) {
    return { status: 404, body: { error: "research topic not found" } };
  }

  const db = getDb();
  if (!db) {
    return { status: 500, body: { error: "database not configured" } };
  }

  const topicRows = await db
    .select()
    .from(researchTopics)
    .where(eq(researchTopics.id, parsedId.data))
    .limit(1);

  const topicRow = topicRows[0];
  if (!topicRow) {
    return { status: 404, body: { error: "research topic not found" } };
  }

  const signalRows = await db
    .select()
    .from(researchSignals)
    .where(eq(researchSignals.topicId, parsedId.data))
    .orderBy(desc(researchSignals.computedAt));

  const detail = ResearchTopicDetailSchema.parse({
    topic: rowToResearchTopic(topicRow),
    signals: signalRows.map((row) => rowToResearchSignal(row)),
  });

  return { status: 200, body: detail };
}

/** GET research topic detail + signals (C84). */
export async function getResearchTopic(topicId: string): Promise<BffResult<ResearchTopicDetail>> {
  if (isFixtureMode()) {
    return getResearchTopicFixture(topicId);
  }

  return getResearchTopicFromDb(topicId);
}

function createResearchTopicFixture(rawBody: unknown): BffResult<ResearchTopic> {
  const parsed = ResearchTopicCreateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return { status: 400, body: { error: "invalid research topic body" } };
  }

  const now = new Date().toISOString();
  const created = ResearchTopicSchema.parse({
    id: randomUUID(),
    title: parsed.data.title,
    scopeEntityId: parsed.data.scopeEntityId,
    signalCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  ensureFixtureTopics().push(created);
  return { status: 201, body: created };
}

async function createResearchTopicInDb(rawBody: unknown): Promise<BffResult<ResearchTopic>> {
  const parsed = ResearchTopicCreateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return { status: 400, body: { error: "invalid research topic body" } };
  }

  const db = getDb();
  if (!db) {
    return { status: 500, body: { error: "database not configured" } };
  }

  const now = new Date();
  const inserted = await db
    .insert(researchTopics)
    .values({
      title: parsed.data.title,
      scopeEntityId: parsed.data.scopeEntityId ?? null,
      signalCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    return { status: 500, body: { error: "failed to create research topic" } };
  }

  return { status: 201, body: rowToResearchTopic(row) };
}

/** POST research topic seed (C85). */
export async function createResearchTopic(rawBody: unknown): Promise<BffResult<ResearchTopic>> {
  if (isFixtureMode()) {
    return createResearchTopicFixture(rawBody);
  }

  return createResearchTopicInDb(rawBody);
}

function loadCloudA3IntelFixture(): ResearchIntel {
  return ResearchIntelSchema.parse(
    JSON.parse(readFileSync(join(cloudA3FixturesRoot, "research-intel.valid.json"), "utf8")),
  );
}

/** Derive intel DTO from persisted / fixture signals. */
export function deriveResearchIntelFromSignals(
  topicId: string | undefined,
  signals: ResearchSignal[],
): ResearchIntel {
  const outliers = signals
    .filter((signal) => signal.signalType === "engagement_outlier")
    .map((signal) => {
      const payload = signal.payloadJson ?? {};
      return {
        factId: typeof payload.metricFactId === "string" ? payload.metricFactId : signal.id,
        sourceEntityId: signal.sourceEntityId,
        sourceSnapshotId: signal.sourceSnapshotId,
        value: typeof payload.value === "number" ? payload.value : signal.score,
        median: typeof payload.median === "number" ? payload.median : 0,
        multiplier: typeof payload.multiplier === "number" ? payload.multiplier : signal.score,
        shortcode: typeof payload.shortcode === "string" ? payload.shortcode : undefined,
        caption: typeof payload.caption === "string" ? payload.caption : undefined,
      };
    });

  const hooks = signals
    .filter((signal) => signal.signalType === "caption_hook")
    .map((signal) => {
      const payload = signal.payloadJson ?? {};
      return {
        caption: typeof payload.caption === "string" ? payload.caption : "",
        score: typeof payload.hookScore === "number" ? payload.hookScore : signal.score,
        mocked: payload.mocked === true,
        rationale: typeof payload.rationale === "string" ? payload.rationale : undefined,
      };
    });

  const briefSignal = signals.find((signal) => signal.signalType === "weekly_brief");
  const weeklyBrief = briefSignal
    ? {
        text:
          typeof briefSignal.payloadJson?.text === "string"
            ? briefSignal.payloadJson.text
            : "",
        groundedIn: Array.isArray(briefSignal.payloadJson?.groundedIn)
          ? briefSignal.payloadJson.groundedIn.filter(
              (item): item is string => typeof item === "string",
            )
          : [],
        mocked: briefSignal.payloadJson?.mocked === true,
      }
    : undefined;

  const competitorSignal = signals.find((signal) => signal.signalType === "competitor_graph");
  const competitor = competitorSignal
    ? {
        handle:
          typeof competitorSignal.payloadJson?.handle === "string"
            ? competitorSignal.payloadJson.handle
            : "@unknown",
        source:
          competitorSignal.payloadJson?.source === "graph" ? ("graph" as const) : ("fixture" as const),
        skippedReason:
          typeof competitorSignal.payloadJson?.skippedReason === "string"
            ? competitorSignal.payloadJson.skippedReason
            : undefined,
      }
    : undefined;

  return ResearchIntelSchema.parse({
    topicId,
    outliers,
    hooks,
    weeklyBrief: weeklyBrief?.text ? weeklyBrief : undefined,
    competitor,
  });
}

function getResearchIntelFixture(topicId?: string): BffResult<ResearchIntel> {
  const intel = loadCloudA3IntelFixture();
  if (topicId) {
    const parsedId = ResearchTopicIdSchema.safeParse(topicId);
    if (!parsedId.success || (intel.topicId && intel.topicId !== parsedId.data)) {
      return { status: 404, body: { error: "research intel not found" } };
    }
  }
  return { status: 200, body: intel };
}

async function getResearchIntelFromDb(topicId?: string): Promise<BffResult<ResearchIntel>> {
  if (!topicId) {
    const list = await listResearchTopicsFromDb();
    if (list.status !== 200) {
      return { status: list.status, body: list.body };
    }
    const first = list.body.topics[0];
    if (!first) {
      return {
        status: 200,
        body: ResearchIntelSchema.parse({ outliers: [], hooks: [] }),
      };
    }
    return getResearchIntelFromDb(first.id);
  }

  const detail = await getResearchTopicFromDb(topicId);
  if (detail.status !== 200) {
    return { status: detail.status, body: detail.body };
  }
  return {
    status: 200,
    body: deriveResearchIntelFromSignals(detail.body.topic.id, detail.body.signals),
  };
}

/** CLOUD-A3 — outliers + weekly brief (+ optional fixture competitor). */
export async function getResearchIntel(topicId?: string): Promise<BffResult<ResearchIntel>> {
  if (isFixtureMode()) {
    return getResearchIntelFixture(topicId);
  }
  return getResearchIntelFromDb(topicId);
}
