import type { CollectSource, MergedInstagramPostPayload } from "@zeref/contracts";

/** Metric pipeline version written to `metric_facts.metric_version`. */
export const METRIC_VERSION = "phase3-v1";

/** Comment weight in engagement raw signal (normalize stage). */
export const ENGAGEMENT_COMMENT_WEIGHT = 3;

/** Fields extracted from merged Instagram payload (Graph wins counts/caption). */
export type NormalizedPostFields = {
  shortcode: string;
  sources: CollectSource[];
  caption?: string;
  likes?: number;
  comments?: number;
  mediaType?: string;
};

export type EngagementResult = {
  engagementScore: number | null;
  insufficientData: boolean;
  reason?: string;
};

export type MetricFactsResult = {
  metricVersion: typeof METRIC_VERSION;
  engagementScore: number | null;
  insufficientData: boolean;
  nicheTags: string[];
  factsJson: {
    shortcode: string;
    sources: CollectSource[];
    engagementReason?: string;
    cohortBaseline?: number;
  };
};

export type RetrievalItem = {
  id: string;
  embedding: number[];
};

export type RetrievalQueryFixture = {
  id: string;
  embedding: number[];
  expectedTop3: [string, string, string];
};

export type RetrievalCorpusFixture = {
  items: RetrievalItem[];
};

export function fieldsFromMerged(
  merged: MergedInstagramPostPayload,
): NormalizedPostFields {
  const { graph, scrape } = merged;
  const likes = graph?.like_count ?? scrape?.likes;
  const comments = graph?.comments_count ?? scrape?.comments;
  const caption = graph?.caption ?? scrape?.caption;
  const mediaType = graph?.media_type ?? scrape?.videoUrl
    ? "VIDEO"
    : scrape?.carouselUrls?.length
      ? "CAROUSEL_ALBUM"
      : undefined;

  return {
    shortcode: merged.shortcode,
    sources: merged.sources,
    caption,
    likes,
    comments,
    mediaType,
  };
}
