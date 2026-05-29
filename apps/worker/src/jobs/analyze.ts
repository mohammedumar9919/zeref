import {
  AnalyzeJobInputSchema,
  AnalyzeJobOutputSchema,
  type AnalyzeJobOutput,
  type NormalizedEntityId,
  type SnapshotId,
} from "@zeref/contracts";
import { cohortVsBaselineLabel } from "@zeref/reports";
import {
  analysisOutputs,
  embeddingVectors,
  metricFacts,
  normalizedEntities,
  schema,
  snapshots,
} from "@zeref/db";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { isAutoReportEnabled } from "../lib/auto-report.js";
import { runReport, type ReportHandlerDeps } from "./report.js";

export type AnalyzeHandlerDeps = ReportHandlerDeps & {
  pool: Pool;
  autoReport?: boolean;
};

/**
 * Analyze handler: upstream IDs → structured analysis_outputs (C19: no instagram).
 */
export async function runAnalyze(
  rawInput: unknown,
  deps: AnalyzeHandlerDeps,
): Promise<AnalyzeJobOutput> {
  const input = AnalyzeJobInputSchema.parse(rawInput);
  const db = drizzle(deps.pool, { schema });

  let normalizedEntityId = input.normalizedEntityId;
  let snapshotId = input.snapshotId;

  if (normalizedEntityId) {
    const rows = await db
      .select()
      .from(normalizedEntities)
      .where(eq(normalizedEntities.id, normalizedEntityId))
      .limit(1);
    const entity = rows[0];
    if (!entity) {
      throw new Error(`normalized entity not found: ${normalizedEntityId}`);
    }
    snapshotId = snapshotId ?? (entity.snapshotId as SnapshotId);
  } else if (snapshotId) {
    const rows = await db
      .select()
      .from(normalizedEntities)
      .where(eq(normalizedEntities.snapshotId, snapshotId))
      .limit(1);
    normalizedEntityId = rows[0]?.id as NormalizedEntityId | undefined;
    if (!normalizedEntityId) {
      throw new Error(`no normalized entity for snapshot: ${snapshotId}`);
    }
  }

  const factRows = normalizedEntityId
    ? await db
        .select()
        .from(metricFacts)
        .where(eq(metricFacts.normalizedEntityId, normalizedEntityId))
    : [];

  const primaryFact = factRows[0];
  let insufficientData = primaryFact?.insufficientData ?? true;
  if (input.insufficientData != null) {
    insufficientData = true;
  }
  const engagementScore =
    primaryFact?.engagementScore != null ? Number(primaryFact.engagementScore) : null;
  if (engagementScore == null || !Number.isFinite(engagementScore)) {
    insufficientData = true;
  }

  const embedCount = normalizedEntityId
    ? (
        await db
          .select({ id: embeddingVectors.id })
          .from(embeddingVectors)
          .where(eq(embeddingVectors.normalizedEntityId, normalizedEntityId))
      ).length
    : 0;

  let periodStart = new Date().toISOString();
  let periodEnd = new Date().toISOString();
  let followerCount: number | undefined;
  if (snapshotId) {
    const snapRows = await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.id, snapshotId))
      .limit(1);
    const snap = snapRows[0];
    if (snap?.collectedAt) {
      periodEnd = snap.collectedAt.toISOString();
      periodStart = snap.collectedAt.toISOString();
    }
  }

  const vsCohort = cohortVsBaselineLabel(engagementScore, followerCount, insufficientData);

  const payloadJson = {
    schemaVersion: input.schemaVersion,
    normalizedEntityId,
    snapshotId,
    engagementScore,
    nicheTags: primaryFact?.nicheTags ?? [],
    insufficientData,
    cohortLabel: "account_baseline",
    cohortSampleSize: factRows.length,
    vsCohort,
    embeddingCount: embedCount,
    metricFactIds: factRows.map((f) => f.id),
  };

  const inserted = await db
    .insert(analysisOutputs)
    .values({
      normalizedEntityId,
      snapshotId,
      schemaVersion: input.schemaVersion,
      payloadJson,
    })
    .returning({ id: analysisOutputs.id });

  const row = inserted[0];
  if (!row) {
    throw new Error("analysis_outputs INSERT returned no row");
  }

  const output = AnalyzeJobOutputSchema.parse({
    analysisOutputId: row.id,
    ...(normalizedEntityId ? { normalizedEntityId } : {}),
    ...(snapshotId ? { snapshotId } : {}),
    insufficientData,
  });

  if (deps.autoReport !== false && isAutoReportEnabled()) {
    await runReport(
      {
        jobType: "report",
        schemaVersion: input.schemaVersion,
        analysisOutputId: row.id,
        includeJarvisBrief: process.env.ZEREF_INCLUDE_JARVIS_BRIEF === "1",
      },
      deps,
    );
  }

  return output;
}

export function createAnalyzeHandler(deps: AnalyzeHandlerDeps) {
  return async (job: { data: unknown }): Promise<AnalyzeJobOutput> =>
    runAnalyze(job.data, deps);
}
