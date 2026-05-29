import { relativeEngagement } from "@zeref/analytics";

export type CohortVsBaseline = "above" | "below" | "inline" | "unknown";

/** Map relative engagement index to elite vsCohort label. */
export function cohortVsBaselineLabel(
  engagementScore: number | null | undefined,
  followerCount: number | undefined,
  insufficientData: boolean,
): CohortVsBaseline {
  if (insufficientData || engagementScore == null || !Number.isFinite(engagementScore)) {
    return "unknown";
  }
  const relative = relativeEngagement(engagementScore, followerCount);
  if (relative > 105) return "above";
  if (relative < 95) return "below";
  return "inline";
}
