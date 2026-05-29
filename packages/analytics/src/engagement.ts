import {
  ENGAGEMENT_COMMENT_WEIGHT,
  type EngagementResult,
  type NormalizedPostFields,
} from "./types.js";

function hasCount(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Bounded engagement score from normalized like/comment counts.
 * Returns `insufficient_data` when both counts are absent.
 */
export function computeEngagement(fields: NormalizedPostFields): EngagementResult {
  const hasLikes = hasCount(fields.likes);
  const hasComments = hasCount(fields.comments);

  if (!hasLikes && !hasComments) {
    return {
      engagementScore: null,
      insufficientData: true,
      reason: "missing_engagement_counts",
    };
  }

  const likes = hasLikes ? fields.likes! : 0;
  const comments = hasComments ? fields.comments! : 0;
  const raw = likes + ENGAGEMENT_COMMENT_WEIGHT * comments;
  const engagementScore = Number(
    ((100 * raw) / (raw + 100)).toFixed(6),
  );

  return {
    engagementScore,
    insufficientData: false,
  };
}
