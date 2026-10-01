import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ENGAGEMENT_TREND_MAX_POINTS,
  ENGAGEMENT_TREND_MIN_SCORED,
  EngagementTrendSchema,
  type EngagementTrend,
  type EngagementTrendPoint,
} from "@zeref/contracts";
import { metricFacts, normalizedEntities, snapshots } from "@zeref/db";
import { desc, eq } from "drizzle-orm";

import { median } from "@/components/reports/chart-math";
import { getDb, isFixtureMode } from "@/lib/db";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const fixturePath = join(repoRoot, "fixtures/phase-14/engagement-trend.json");

/** Rows scanned for the live trend; deduped to the latest fact per post. */
const LIVE_SCAN_LIMIT = 300;

export type EngagementTrendResult =
  | { status: 200; body: EngagementTrend }
  | { status: 500; body: { error: string } };

/** Sort, cap and derive median / insufficientData from the points themselves. */
export function buildEngagementTrend(
  points: EngagementTrendPoint[],
  source: EngagementTrend["source"],
): EngagementTrend {
  const sorted = [...points]
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .slice(-ENGAGEMENT_TREND_MAX_POINTS);
  const scores = sorted
    .map((p) => p.engagementScore)
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s));
  return EngagementTrendSchema.parse({
    points: sorted,
    median: median(scores),
    source,
    insufficientData: scores.length < ENGAGEMENT_TREND_MIN_SCORED,
  });
}

function postTitle(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const { caption, shortcode } = payload as { caption?: unknown; shortcode?: unknown };
    if (typeof caption === "string" && caption.trim()) {
      const trimmed = caption.trim();
      return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
    }
    if (typeof shortcode === "string" && shortcode) return shortcode;
  }
  return "Post";
}

function publishedAt(snapshotPayload: unknown): string | null {
  if (snapshotPayload && typeof snapshotPayload === "object") {
    const ts = (snapshotPayload as { timestamp?: unknown }).timestamp;
    if (typeof ts === "string" && !Number.isNaN(Date.parse(ts))) {
      return new Date(ts).toISOString();
    }
  }
  return null;
}

function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function loadFixtureTrend(): EngagementTrend {
  const raw = EngagementTrendSchema.parse(JSON.parse(readFileSync(fixturePath, "utf8")));
  return buildEngagementTrend(raw.points, "fixture");
}

async function loadLiveTrend(): Promise<EngagementTrendResult> {
  const db = getDb();
  if (!db) {
    return { status: 500, body: { error: "database not configured" } };
  }

  const rows = await db
    .select({
      entityId: normalizedEntities.id,
      entityPayload: normalizedEntities.payloadJson,
      snapshotPayload: snapshots.payloadJson,
      collectedAt: snapshots.collectedAt,
      engagementScore: metricFacts.engagementScore,
      factCreatedAt: metricFacts.createdAt,
    })
    .from(metricFacts)
    .innerJoin(normalizedEntities, eq(metricFacts.normalizedEntityId, normalizedEntities.id))
    .innerJoin(snapshots, eq(normalizedEntities.snapshotId, snapshots.id))
    .orderBy(desc(metricFacts.createdAt))
    .limit(LIVE_SCAN_LIMIT);

  const latestByEntity = new Map<string, EngagementTrendPoint>();
  for (const row of rows) {
    if (latestByEntity.has(row.entityId)) continue;
    const published = publishedAt(row.snapshotPayload);
    latestByEntity.set(row.entityId, {
      entityId: row.entityId as EngagementTrendPoint["entityId"],
      title: postTitle(row.entityPayload),
      at: published ?? new Date(row.collectedAt).toISOString(),
      timeBasis: published ? "published" : "collected",
      engagementScore: toNumber(row.engagementScore),
    });
  }

  return { status: 200, body: buildEngagementTrend([...latestByEntity.values()], "live") };
}

/** GET /api/v1/reports/engagement-trend — per-post engagement + own median (C6). */
export async function getEngagementTrend(): Promise<EngagementTrendResult> {
  if (isFixtureMode()) {
    return { status: 200, body: loadFixtureTrend() };
  }
  try {
    return await loadLiveTrend();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 500, body: { error: `engagement trend query failed: ${message}` } };
  }
}
