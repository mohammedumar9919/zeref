import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CockpitSlicesSchema,
  EliteReportSchema,
  NormalizedPostPayloadSchema,
  ReportArtifactIdSchema,
  type CockpitSlices,
  type EliteReport,
} from "@zeref/contracts";
import { normalizedEntities, reportArtifacts } from "@zeref/db";
import { and, desc, eq } from "drizzle-orm";

import { getDb, isFixtureMode, resetDbPoolForTests } from "./db";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const fixturePath = join(repoRoot, "fixtures/phase-5/cockpit-slices.fixture.json");
const eliteFixturePath = join(
  repoRoot,
  "fixtures/phase-4/elite/ride-log-elite.golden.json",
);

export const FIXTURE_ARTIFACT_ID = "550e8400-e29b-41d4-a716-446655440000";

export type BffResult<T> =
  | { status: 200; body: T }
  | { status: 404; body: { error: string } }
  | { status: 500; body: { error: string } };

function loadFixtureSlices(): CockpitSlices {
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
  return CockpitSlicesSchema.parse(raw);
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

async function loadCockpitSlicesFromDb(): Promise<CockpitSlices> {
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

  return CockpitSlicesSchema.parse({
    schemaVersion: "phase5-cockpit-v1",
    panels: {
      studio: {
        items: studioRows.map((row) => ({
          entityId: row.id,
          title: studioTitle(row.payloadJson),
          snapshotId: row.snapshotId,
          updatedAt: toIsoString(row.createdAt),
        })),
        insufficientData: studioRows.length === 0,
      },
      calendar: {
        items: [],
        insufficientData: false,
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

/** Read-only cockpit summary DTO (C27 / ADR-016). */
export async function loadCockpitSlices(): Promise<CockpitSlices> {
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
