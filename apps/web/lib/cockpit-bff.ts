import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CockpitSlicesSchemaV8,
  CockpitSlicesSchemaV9,
  EliteReportSchema,
  NormalizedPostPayloadSchema,
  ReportArtifactIdSchema,
  type CockpitSlicesV8,
  type CockpitSlicesV9,
  type EliteReport,
} from "@zeref/contracts";
import {
  calendarEvents,
  normalizedEntities,
  reportArtifacts,
  researchTopics,
  snapshots,
  studioDrafts,
} from "@zeref/db";
import { and, desc, eq } from "drizzle-orm";

import { getDb, isFixtureMode, resetDbPoolForTests } from "./db";
import {
  aggregatePanelDataAgeState,
  computeDataAge,
  type DataAgeState,
} from "./data-age";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const phase8FixturePath = join(repoRoot, "fixtures/phase-8/cockpit-slices.valid.json");
const phase9FixturePath = join(repoRoot, "fixtures/phase-9/cockpit-slices.valid.json");
const eliteFixturePath = join(
  repoRoot,
  "fixtures/phase-4/elite/ride-log-elite.golden.json",
);

export function isPhase9ResearchActive(): boolean {
  return process.env.ZEREF_PHASE9_RESEARCH === "1";
}

export const FIXTURE_ARTIFACT_ID = "550e8400-e29b-41d4-a716-446655440000";

export type BffResult<T> =
  | { status: 200; body: T }
  | { status: 404; body: { error: string } }
  | { status: 500; body: { error: string } };

function loadFixtureSlices(): CockpitSlicesV8 | CockpitSlicesV9 {
  const path = isPhase9ResearchActive() ? phase9FixturePath : phase8FixturePath;
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const parsed = isPhase9ResearchActive()
    ? CockpitSlicesSchemaV9.parse(raw)
    : CockpitSlicesSchemaV8.parse(raw);

  const fixtureState: DataAgeState = "fixture";
  const panels = parsed.panels;

  return {
    ...parsed,
    panels: {
      ...panels,
      studio: {
        ...panels.studio,
        dataAgeState: fixtureState,
        items: panels.studio.items.map((item) => ({ ...item, dataAgeState: fixtureState })),
      },
      calendar: {
        ...panels.calendar,
        dataAgeState: fixtureState,
        items: panels.calendar.items.map((item) => ({ ...item, dataAgeState: fixtureState })),
      },
      // CockpitReportItemSchema and CockpitResearchItemSchema are strict:
      // data-age is panel-level only; do not spread onto items.
      reports: {
        ...panels.reports,
        dataAgeState: fixtureState,
      },
      research: {
        ...panels.research,
        dataAgeState: fixtureState,
      },
    },
  };
}

function draftPreview(caption: string): string | undefined {
  const trimmed = caption.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

function loadFixtureEliteReport(): EliteReport {
  const raw = JSON.parse(readFileSync(eliteFixturePath, "utf8")) as unknown;
  return EliteReportSchema.parse(raw);
}

function studioTitle(payloadJson: unknown): string {
  const parsed = NormalizedPostPayloadSchema.safeParse(payloadJson);
  if (parsed.success) {
    if (parsed.data.caption?.trim()) {
      const trimmed = parsed.data.caption.trim();
      return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
    }
    return parsed.data.shortcode;
  }

  if (payloadJson && typeof payloadJson === "object" && "shortcode" in payloadJson) {
    const shortcode = (payloadJson as { shortcode?: unknown }).shortcode;
    if (typeof shortcode === "string" && shortcode.length > 0) {
      return shortcode;
    }
  }

  return "Normalized entity";
}

function eliteHeadline(payloadJson: unknown): string {
  if (
    payloadJson &&
    typeof payloadJson === "object" &&
    "headline" in payloadJson &&
    (payloadJson as { headline?: { text?: unknown } }).headline?.text
  ) {
    const text = (payloadJson as { headline: { text: unknown } }).headline.text;
    if (typeof text === "string" && text.length > 0) {
      return text;
    }
  }

  return "Elite report";
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

async function loadResearchPanelFromDb(
  db: NonNullable<ReturnType<typeof getDb>>,
): Promise<{
  items: Array<{
    id: string;
    title: string;
    trendScore?: number;
    signalCount?: number;
    lastComputedAt?: string;
  }>;
  insufficientData: boolean;
  panelDataAgeState: DataAgeState;
}> {
  const researchRows = await db
    .select({
      id: researchTopics.id,
      title: researchTopics.title,
      trendScore: researchTopics.trendScore,
      signalCount: researchTopics.signalCount,
      lastComputedAt: researchTopics.lastComputedAt,
    })
    .from(researchTopics)
    .orderBy(desc(researchTopics.lastComputedAt))
    .limit(20);

  const nowMs = Date.now();
  // CockpitResearchItemSchema is strict — no data-age item extensions allowed.
  // Compute panel-level aggregate from raw timestamps before Zod parsing.
  const panelDataAgeState = aggregatePanelDataAgeState(
    researchRows.map((row) =>
      computeDataAge(row.lastComputedAt ? toIsoString(row.lastComputedAt) : undefined, nowMs, false),
    ),
  );

  return {
    items: researchRows.map((row) => ({
      id: row.id,
      title: row.title,
      trendScore: row.trendScore != null ? Number(row.trendScore) : undefined,
      signalCount: row.signalCount,
      lastComputedAt: row.lastComputedAt ? toIsoString(row.lastComputedAt) : undefined,
    })),
    insufficientData: researchRows.length === 0,
    panelDataAgeState,
  };
}

async function loadCockpitSlicesFromDb(): Promise<CockpitSlicesV8 | CockpitSlicesV9> {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured for cockpit BFF");
  }

  const [studioRows, draftRows, calendarRows, reportRows, researchPanel] =
    await Promise.all([
      db
        .select({
          id: normalizedEntities.id,
          snapshotId: normalizedEntities.snapshotId,
          payloadJson: normalizedEntities.payloadJson,
          createdAt: normalizedEntities.createdAt,
          collectedAt: snapshots.collectedAt,
        })
        .from(normalizedEntities)
        .leftJoin(snapshots, eq(normalizedEntities.snapshotId, snapshots.id))
        .orderBy(desc(normalizedEntities.createdAt))
        .limit(10),
      db
        .select({
          entityId: studioDrafts.entityId,
          caption: studioDrafts.caption,
          updatedAt: studioDrafts.updatedAt,
        })
        .from(studioDrafts),
      db
        .select({
          id: calendarEvents.id,
          title: calendarEvents.title,
          scheduledAt: calendarEvents.scheduledAt,
          status: calendarEvents.status,
        })
        .from(calendarEvents)
        .orderBy(desc(calendarEvents.scheduledAt))
        .limit(20),
      db
        .select({
          id: reportArtifacts.id,
          payloadJson: reportArtifacts.payloadJson,
          createdAt: reportArtifacts.createdAt,
        })
        .from(reportArtifacts)
        .where(eq(reportArtifacts.artifactKind, "elite"))
        .orderBy(desc(reportArtifacts.createdAt))
        .limit(20),
      loadResearchPanelFromDb(db),
    ]);

  const draftsByEntity = new Map(
    draftRows.map((row) => [
      row.entityId,
      { caption: row.caption, updatedAt: toIsoString(row.updatedAt) },
    ]),
  );

  const nowMs = Date.now();
  const studioPanel = {
    items: studioRows.map((row) => {
      const draft = draftsByEntity.get(row.id);
      const preview = draft ? draftPreview(draft.caption) : undefined;
      const age = computeDataAge(row.collectedAt ? toIsoString(row.collectedAt) : undefined, nowMs, false);
      return {
        entityId: row.id,
        title: studioTitle(row.payloadJson),
        snapshotId: row.snapshotId,
        updatedAt: draft?.updatedAt ?? toIsoString(row.createdAt),
        hasDraft: Boolean(draft),
        draftPreview: preview,
        status: draft ? ("draft" as const) : undefined,
        ...age,
      };
    }),
    insufficientData: studioRows.length === 0,
  };

  const calendarPanel = {
    items: calendarRows.map((row) => ({
      id: row.id,
      title: row.title,
      scheduledAt: toIsoString(row.scheduledAt),
      status: row.status,
      ...computeDataAge(toIsoString(row.scheduledAt), nowMs, false),
    })),
    insufficientData: calendarRows.length === 0,
  };

  // CockpitReportItemSchema is strict and has no data-age item extensions —
  // so we compute panel-level state from raw row timestamps before Zod parses.
  const reportsPanelDataAgeState = aggregatePanelDataAgeState(
    reportRows.map((row) => computeDataAge(toIsoString(row.createdAt), nowMs, false)),
  );
  const reportsPanel = {
    items: reportRows.map((row) => ({
      artifactId: row.id,
      kind: "elite" as const,
      headline: eliteHeadline(row.payloadJson),
      createdAt: toIsoString(row.createdAt),
    })),
    insufficientData: reportRows.length === 0,
  };

  if (isPhase9ResearchActive()) {
    return CockpitSlicesSchemaV9.parse({
      schemaVersion: "phase9-cockpit-v1",
      panels: {
        studio: { ...studioPanel, dataAgeState: aggregatePanelDataAgeState(studioPanel.items) },
        calendar: { ...calendarPanel, dataAgeState: aggregatePanelDataAgeState(calendarPanel.items) },
        reports: { ...reportsPanel, dataAgeState: reportsPanelDataAgeState },
        research: { items: researchPanel.items, insufficientData: researchPanel.insufficientData, dataAgeState: researchPanel.panelDataAgeState },
      },
    });
  }

  return CockpitSlicesSchemaV8.parse({
    schemaVersion: "phase8-cockpit-v1",
    panels: {
      studio: { ...studioPanel, dataAgeState: aggregatePanelDataAgeState(studioPanel.items) },
      calendar: { ...calendarPanel, dataAgeState: aggregatePanelDataAgeState(calendarPanel.items) },
      reports: { ...reportsPanel, dataAgeState: reportsPanelDataAgeState },
      research: {
        items: [],
        insufficientData: true,
        dataAgeState: "stale",
      },
    },
  });
}

/** Read-only cockpit summary DTO (C27 / ADR-016; phase9-cockpit-v1 when Phase 9 active). */
export async function loadCockpitSlices(): Promise<CockpitSlicesV8 | CockpitSlicesV9> {
  if (isFixtureMode()) {
    return loadFixtureSlices();
  }

  return loadCockpitSlicesFromDb();
}

async function getReportArtifactFromDb(id: string): Promise<BffResult<EliteReport>> {
  const artifactId = ReportArtifactIdSchema.safeParse(id);
  if (!artifactId.success) {
    return { status: 404, body: { error: "report artifact not found" } };
  }

  const db = getDb();
  if (!db) {
    return { status: 404, body: { error: "report artifact not found" } };
  }

  const rows = await db
    .select({ payloadJson: reportArtifacts.payloadJson })
    .from(reportArtifacts)
    .where(and(eq(reportArtifacts.id, artifactId.data), eq(reportArtifacts.artifactKind, "elite")))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return { status: 404, body: { error: "report artifact not found" } };
  }

  try {
    return { status: 200, body: EliteReportSchema.parse(row.payloadJson) };
  } catch {
    return { status: 500, body: { error: "invalid elite report payload" } };
  }
}

/** Read-only elite artifact detail (C29 / ADR-016). */
export async function getReportArtifact(id: string): Promise<BffResult<EliteReport>> {
  if (isFixtureMode()) {
    const artifactId = ReportArtifactIdSchema.safeParse(id);
    if (!artifactId.success || artifactId.data !== FIXTURE_ARTIFACT_ID) {
      return { status: 404, body: { error: "report artifact not found" } };
    }

    return { status: 200, body: loadFixtureEliteReport() };
  }

  return getReportArtifactFromDb(id);
}

export { resetDbPoolForTests } from "./db";
