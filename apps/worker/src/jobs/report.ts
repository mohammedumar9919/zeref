import {
  AnalysisOutputIdSchema,
  ReportArtifactIdSchema,
  ReportJobInputSchema,
  ReportJobOutputSchema,
  type PlatformAccountId,
  type ReportJobOutput,
} from "@zeref/contracts";
import {
  buildEliteReport,
  generateNarrative,
  lintNarrativeCitations,
  type MetricFactCitationSource,
} from "@zeref/reports";
import { analysisOutputs, metricFacts, reportArtifacts, schema } from "@zeref/db";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

export type ReportHandlerDeps = {
  pool: Pool;
};

async function resolveAnalysisOutputId(
  db: ReturnType<typeof drizzle<typeof schema>>,
  input: {
    analysisOutputId?: string;
    normalizedEntityId?: string;
    snapshotId?: string;
  },
): Promise<string> {
  if (input.analysisOutputId) {
    return input.analysisOutputId;
  }

  if (input.normalizedEntityId) {
    const byEntity = await db
      .select({ id: analysisOutputs.id })
      .from(analysisOutputs)
      .where(eq(analysisOutputs.normalizedEntityId, input.normalizedEntityId))
      .orderBy(desc(analysisOutputs.createdAt))
      .limit(1);
    if (byEntity[0]?.id) return byEntity[0].id;
  }

  if (input.snapshotId) {
    const bySnapshot = await db
      .select({ id: analysisOutputs.id })
      .from(analysisOutputs)
      .where(eq(analysisOutputs.snapshotId, input.snapshotId))
      .orderBy(desc(analysisOutputs.createdAt))
      .limit(1);
    if (bySnapshot[0]?.id) return bySnapshot[0].id;
  }

  throw new Error(
    "report requires analysisOutputId (or a normalizedEntityId/snapshotId with an existing analysis_outputs row)",
  );
}

/**
 * Report handler: analysis_outputs → elite (+ optional jarvis_brief) artifacts (C19, C23).
 */
export async function runReport(
  rawInput: unknown,
  deps: ReportHandlerDeps,
): Promise<ReportJobOutput> {
  const input = ReportJobInputSchema.parse(rawInput);
  const db = drizzle(deps.pool, { schema });

  const analysisId = AnalysisOutputIdSchema.parse(
    await resolveAnalysisOutputId(db, input),
  );
  const analysisRows = await db
    .select()
    .from(analysisOutputs)
    .where(eq(analysisOutputs.id, analysisId))
    .limit(1);

  const analysis = analysisRows[0];
  if (!analysis) {
    throw new Error(`analysis output not found: ${analysisId}`);
  }

  const payload = analysis.payloadJson as Record<string, unknown>;
  const normalizedEntityId = analysis.normalizedEntityId ?? (payload.normalizedEntityId as string);
  const factRows = normalizedEntityId
    ? await db
        .select()
        .from(metricFacts)
        .where(eq(metricFacts.normalizedEntityId, normalizedEntityId))
    : [];

  const metricSources: MetricFactCitationSource[] = factRows.map((f) => ({
    id: f.id,
    engagementScore: f.engagementScore,
    insufficientData: f.insufficientData,
  }));

  const platformAccountId = factRows[0]?.platformAccountId as PlatformAccountId | undefined;
  if (!platformAccountId) {
    throw new Error("report requires metric_facts with platform_account_id");
  }

  const engagementScore =
    typeof payload.engagementScore === "number" ? payload.engagementScore : null;
  const insufficientData = Boolean(payload.insufficientData);
  const periodStart =
    typeof payload.periodStart === "string"
      ? payload.periodStart
      : new Date(Date.now() - 7 * 86400000).toISOString();
  const periodEnd =
    typeof payload.periodEnd === "string" ? payload.periodEnd : new Date().toISOString();

  const narrative = await generateNarrative({
    engagementScore,
    insufficientData,
    metricFacts: metricSources,
  });

  const elite = buildEliteReport({
    platformAccountId,
    periodStart,
    periodEnd,
    analysis: {
      schemaVersion: input.schemaVersion,
      engagementScore,
      nicheTags: Array.isArray(payload.nicheTags) ? (payload.nicheTags as string[]) : [],
      insufficientData,
      cohortLabel:
        typeof payload.cohortLabel === "string" ? payload.cohortLabel : "account_baseline",
      cohortSampleSize:
        typeof payload.cohortSampleSize === "number" ? payload.cohortSampleSize : factRows.length,
    },
    metricFacts: metricSources,
    narrativeMarkdown: narrative.markdown,
  });

  const lint = lintNarrativeCitations(elite.narrative.markdown, elite.narrative.citationIndex);
  if (!lint.ok && !insufficientData) {
    throw new Error(`citation lint failed: ${lint.errors.join("; ")}`);
  }

  const eliteRows = await db
    .insert(reportArtifacts)
    .values({
      analysisOutputId: analysisId,
      normalizedEntityId: analysis.normalizedEntityId,
      snapshotId: analysis.snapshotId,
      schemaVersion: input.schemaVersion,
      artifactKind: "elite",
      payloadJson: elite,
    })
    .returning({ id: reportArtifacts.id });

  const eliteRow = eliteRows[0];
  if (!eliteRow) {
    throw new Error("elite report_artifacts INSERT returned no row (C23)");
  }

  let jarvisBriefId: string | undefined;
  const includeBrief =
    input.includeJarvisBrief === true || process.env.ZEREF_INCLUDE_JARVIS_BRIEF === "1";

  if (includeBrief) {
    const briefRows = await db
      .insert(reportArtifacts)
      .values({
        analysisOutputId: analysisId,
        normalizedEntityId: analysis.normalizedEntityId,
        snapshotId: analysis.snapshotId,
        schemaVersion: input.schemaVersion,
        artifactKind: "jarvis_brief",
        payloadJson: {
          schemaVersion: "phase4-jarvis-brief-v1",
          summary: elite.headline.text,
          insufficientData,
        },
      })
      .returning({ id: reportArtifacts.id });
    jarvisBriefId = briefRows[0]?.id;
  }

  return ReportJobOutputSchema.parse({
    reportArtifactIds: {
      elite: ReportArtifactIdSchema.parse(eliteRow.id),
      ...(jarvisBriefId
        ? { jarvisBrief: ReportArtifactIdSchema.parse(jarvisBriefId) }
        : {}),
    },
    analysisOutputId: analysisId,
  });
}

export function createReportHandler(deps: ReportHandlerDeps) {
  return async (job: { data: unknown }): Promise<ReportJobOutput> =>
    runReport(job.data, deps);
}
