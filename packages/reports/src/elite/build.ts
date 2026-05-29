import {
  EliteReportSchema,
  type EliteReport,
  type PlatformAccountId,
} from "@zeref/contracts";
import { cohortVsBaselineLabel } from "../cohort.js";
import {
  buildCitationIndex,
  buildDefaultNarrativeMarkdown,
  type MetricFactCitationSource,
} from "../citations.js";

export type AnalysisPayload = {
  schemaVersion: string;
  engagementScore: number | null;
  nicheTags: string[];
  insufficientData: boolean;
  cohortLabel: string;
  cohortSampleSize: number;
  followerCount?: number;
};

export type BuildEliteReportInput = {
  platformAccountId: PlatformAccountId;
  periodStart: string;
  periodEnd: string;
  analysis: AnalysisPayload;
  metricFacts: MetricFactCitationSource[];
  narrativeMarkdown?: string;
};

/** Deterministic elite JSON from analysis + metric_facts (C20). */
export function buildEliteReport(input: BuildEliteReportInput): EliteReport {
  const { analysis, metricFacts, platformAccountId } = input;
  const primary = metricFacts[0];
  const engagementScore = analysis.engagementScore;
  const vsCohort = cohortVsBaselineLabel(
    engagementScore,
    analysis.followerCount,
    analysis.insufficientData,
  );

  const cite = (label: string) =>
    primary && !primary.insufficientData
      ? [{ metricFactId: primary.id, label }]
      : [];

  const citationIndex = buildCitationIndex(metricFacts);
  const markdown =
    input.narrativeMarkdown ??
    buildDefaultNarrativeMarkdown(engagementScore, primary?.id, analysis.insufficientData);

  const report = {
    schemaVersion: "phase4-elite-v1" as const,
    accountRef: { platformAccountId },
    period: { start: input.periodStart, end: input.periodEnd },
    headline: {
      text: analysis.insufficientData
        ? "Insufficient data for a confident headline."
        : "Ride log post shows solid engagement vs account baseline.",
      insufficientData: analysis.insufficientData,
    },
    engagement: {
      score: engagementScore,
      vsCohort,
      citations: cite("engagement_score"),
    },
    niche: {
      pillars: analysis.nicheTags,
      citations: cite("niche_tags"),
    },
    cohort: {
      label: analysis.cohortLabel,
      sampleSize: analysis.cohortSampleSize,
      citations: cite("cohort_baseline"),
    },
    recommendations: analysis.insufficientData
      ? [
          {
            text: "Collect more posts before changing content strategy.",
            priority: "low" as const,
          },
        ]
      : [
          {
            text: "Keep ride_log cadence; engagement is in line with baseline.",
            priority: "medium" as const,
          },
        ],
    narrative: {
      markdown,
      citationIndex,
    },
    insufficientData: analysis.insufficientData,
  };

  return EliteReportSchema.parse(report);
}
