import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CockpitSlicesSchemaV8,
  EliteReportSchema,
  NormalizedPostPayloadSchema,
  ReportArtifactIdSchema,
  type CockpitSlicesV8,
  type EliteReport,
} from "@zeref/contracts";
import {
  calendarEvents,
  normalizedEntities,
  reportArtifacts,
  studioDrafts,
} from "@zeref/db";
import { and, desc, eq } from "drizzle-orm";

import { getDb, isFixtureMode, resetDbPoolForTests } from "./db";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const fixturePath = join(repoRoot, "fixtures/phase-8/cockpit-slices.valid.json");
const eliteFixturePath = join(
  repoRoot,
  "fixtures/phase-4/elite/ride-log-elite.golden.json",
);

export const FIXTURE_ARTIFACT_ID = "550e8400-e29b-41d4-a716-446655440000";

export type BffResult<T> =
  | { status: 200; body: T }
  | { status: 404; body: { error: string } }
  | { status: 500; body: { error: string } };

function loadFixtureSlices(): CockpitSlicesV8 {
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  return CockpitSlicesSchemaV8.parse(raw);
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

async function loadCockpitSlicesFromDb(): Promise<CockpitSlicesV8> {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured for cockpit BFF");
  }

  const studioRows = await db
    .select({
      id: normalizedEntities.id,
      snapshotId: normalizedEntities.snapshotId,
      payloadJson: normalizedEntities.payloadJson,
      createdAt: normalizedEntities.createdAt,
    })
    .from(normalizedEntities)
    .orderBy(desc(normalizedEntities.createdAt))
    .limit(10);

  const draftRows = await db
    .select({
      entityId: studioDrafts.entityId,
      caption: studioDrafts.caption,
      updatedAt: studioDrafts.updatedAt,
    })
    .from(studioDrafts);

  const draftsByEntity = new Map(
    draftRows.map((row) => [
      row.entityId,
      { caption: row.caption, updatedAt: toIsoString(row.updatedAt) },
    ]),
  );

  const calendarRows = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      scheduledAt: calendarEvents.scheduledAt,
      status: calendarEvents.status,
    })
    .from(calendarEvents)
    .orderBy(desc(calendarEvents.scheduledAt))
    .limit(20);

  const reportRows = await db
    .select({
      id: reportArtifacts.id,
      payloadJson: reportArtifacts.payloadJson,
      createdAt: reportArtifacts.createdAt,
    })
    .from(reportArtifacts)
    .where(eq(reportArtifacts.artifactKind, "elite"))
    .orderBy(desc(reportArtifacts.createdAt))
    .limit(20);

  return CockpitSlicesSchemaV8.parse({
    schemaVersion: "phase8-cockpit-v1",
    panels: {
      studio: {
        items: studioRows.map((row) => {
          const draft = draftsByEntity.get(row.id);
          const preview = draft ? draftPreview(draft.caption) : undefined;
          return {
            entityId: row.id,
            title: studioTitle(row.payloadJson),
            snapshotId: row.snapshotId,
            updatedAt: draft?.updatedAt ?? toIsoString(row.createdAt),
            hasDraft: Boolean(draft),
            draftPreview: preview,
            status: draft ? ("draft" as const) : undefined,
          };
        }),
        insufficientData: studioRows.length === 0,
      },
      calendar: {
        items: calendarRows.map((row) => ({
          id: row.id,
          title: row.title,
          scheduledAt: toIsoString(row.scheduledAt),
          status: row.status,
        })),
        insufficientData: calendarRows.length === 0,
      },
      reports: {
        items: reportRows.map((row) => ({
          artifactId: row.id,
          kind: "elite" as const,
          headline: eliteHeadline(row.payloadJson),
          createdAt: toIsoString(row.createdAt),
        })),
        insufficientData: reportRows.length === 0,
      },
      research: {
        items: [],
        insufficientData: true,
      },
    },
  });
}

/** Read-only cockpit summary DTO (C27 / ADR-016, phase8-cockpit-v1). */
export async function loadCockpitSlices(): Promise<CockpitSlicesV8> {
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
