import type { MergedInstagramPostPayload } from "@zeref/contracts";
import type { CohortAccount } from "./cohort.js";
import { accountEngagementBaseline, relativeEngagement } from "./cohort.js";
import { computeEngagement } from "./engagement.js";
import { detectNichePillars } from "./niche.js";
import {
  METRIC_VERSION,
  fieldsFromMerged,
  type MetricFactsResult,
  type NormalizedPostFields,
} from "./types.js";

export const ANALYTICS_PACKAGE_ID = "@zeref/analytics";

export {
  METRIC_VERSION,
  ENGAGEMENT_COMMENT_WEIGHT,
  fieldsFromMerged,
  type NormalizedPostFields,
  type EngagementResult,
  type MetricFactsResult,
  type RetrievalItem,
  type RetrievalQueryFixture,
  type RetrievalCorpusFixture,
} from "./types.js";

export { computeEngagement } from "./engagement.js";
export { NICHE_PILLARS, detectNichePillars, type NichePillar } from "./niche.js";
export {
  cohortKey,
  accountEngagementBaseline,
  relativeEngagement,
  sameCohort,
  type CohortAccount,
} from "./cohort.js";
export {
  cosineSimilarity,
  topKNeighborIds,
  retrievalAtK,
} from "./retrieval.js";

/** Normalize-stage metric bundle for `metric_facts` persistence. */
export function computeMetricFacts(input: {
  merged: MergedInstagramPostPayload;
  account?: CohortAccount;
}): MetricFactsResult {
  const fields = fieldsFromMerged(input.merged);
  const engagement = computeEngagement(fields);
  const nicheTags = detectNichePillars(fields);
  const baseline = accountEngagementBaseline(input.account?.followerCount);

  return {
    metricVersion: METRIC_VERSION,
    engagementScore: engagement.engagementScore,
    insufficientData: engagement.insufficientData,
    nicheTags,
    factsJson: {
      shortcode: fields.shortcode,
      sources: fields.sources,
      ...(engagement.reason ? { engagementReason: engagement.reason } : {}),
      cohortBaseline: baseline,
      ...(engagement.engagementScore != null && input.account
        ? {
            relativeEngagement: relativeEngagement(
              engagement.engagementScore,
              input.account.followerCount,
            ),
          }
        : {}),
    },
  };
}
