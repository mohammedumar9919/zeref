import type { ResearchSignalCandidate, ResearchSignalType } from "@zeref/contracts";

import type { CaptionHookScore, WeeklyBrief } from "./hooks.js";
import {
  findEngagementOutliers,
  outlierValueFromFact,
  type EngagementOutlier,
  type OutlierFact,
} from "./outliers.js";

export type ResearchMetricFactInput = {
  id: string;
  normalizedEntityId: string;
  snapshotId: string;
  engagementScore: number | null;
  insufficientData: boolean;
  factsJson?: Record<string, unknown>;
  caption?: string;
};

export type ResearchEmbeddingInput = {
  id: string;
  normalizedEntityId: string;
  model: string;
};

function roundScore(value: number): number {
  return Number(value.toFixed(6));
}

function engagementDeltaScore(engagementScore: number | null): number | null {
  if (engagementScore == null || !Number.isFinite(engagementScore)) {
    return null;
  }
  return roundScore(Math.min(1, Math.max(0, engagementScore)));
}

/**
 * Build research signal candidates from metric_facts + embedding_vectors rows.
 * Read-only analytics helper for worker `research` job (ADR-032).
 */
export function buildResearchSignalCandidates(input: {
  metricFacts: ResearchMetricFactInput[];
  embeddings: ResearchEmbeddingInput[];
  scopeEntityId?: string;
}): ResearchSignalCandidate[] {
  const scope = input.scopeEntityId;
  const facts = scope
    ? input.metricFacts.filter((f) => f.normalizedEntityId === scope)
    : input.metricFacts;
  const embeds = scope
    ? input.embeddings.filter((e) => e.normalizedEntityId === scope)
    : input.embeddings;

  const candidates: ResearchSignalCandidate[] = [];

  for (const fact of facts) {
    if (fact.insufficientData) {
      continue;
    }
    const score = engagementDeltaScore(fact.engagementScore);
    if (score == null) {
      continue;
    }
    candidates.push({
      sourceEntityId: fact.normalizedEntityId as ResearchSignalCandidate["sourceEntityId"],
      sourceSnapshotId: fact.snapshotId as ResearchSignalCandidate["sourceSnapshotId"],
      signalType: "engagement_delta" as ResearchSignalType,
      score,
      payloadJson: {
        metricFactId: fact.id,
        engagementScore: score,
      },
    });
  }

  const embedByEntity = new Map<string, ResearchEmbeddingInput[]>();
  for (const row of embeds) {
    const list = embedByEntity.get(row.normalizedEntityId) ?? [];
    list.push(row);
    embedByEntity.set(row.normalizedEntityId, list);
  }

  for (const [entityId, rows] of embedByEntity) {
    const count = rows.length;
    if (count === 0) {
      continue;
    }
    const score = roundScore(Math.min(1, 0.5 + count * 0.12));
    candidates.push({
      sourceEntityId: entityId as ResearchSignalCandidate["sourceEntityId"],
      signalType: "embedding_cluster" as ResearchSignalType,
      score,
      payloadJson: {
        embeddingCount: count,
        model: rows[0]?.model ?? "text-embedding-3-small",
      },
    });
  }

  return candidates;
}

/** Aggregate trend score from signal candidates (mean of scores). */
export function aggregateTrendScore(candidates: ResearchSignalCandidate[]): number | null {
  if (candidates.length === 0) {
    return null;
  }
  const sum = candidates.reduce((acc, c) => acc + c.score, 0);
  return roundScore(sum / candidates.length);
}

function toOutlierFacts(metricFacts: ResearchMetricFactInput[]): OutlierFact[] {
  const facts: OutlierFact[] = [];
  for (const fact of metricFacts) {
    if (fact.insufficientData) {
      continue;
    }
    const value = outlierValueFromFact(fact);
    if (value == null) {
      continue;
    }
    const json = fact.factsJson ?? {};
    const shortcode = typeof json.shortcode === "string" ? json.shortcode : undefined;
    const caption =
      fact.caption ?? (typeof json.caption === "string" ? json.caption : undefined);
    facts.push({
      id: fact.id,
      normalizedEntityId: fact.normalizedEntityId,
      snapshotId: fact.snapshotId,
      value,
      shortcode,
      caption,
    });
  }
  return facts;
}

/** Own-account 5× median outliers from metric_facts (CLOUD-A3). */
export function scanOwnAccountOutliers(metricFacts: ResearchMetricFactInput[]): {
  median: number | null;
  outliers: EngagementOutlier[];
} {
  return findEngagementOutliers(toOutlierFacts(metricFacts));
}

/** Build A3 intel signal candidates (outlier, hook, weekly brief, optional fixture competitor). */
export function buildResearchIntelCandidates(input: {
  outliers: EngagementOutlier[];
  hooks?: CaptionHookScore[];
  brief?: WeeklyBrief;
  competitor?: { handle: string; source: "fixture" | "graph"; skippedReason?: string };
}): ResearchSignalCandidate[] {
  const candidates: ResearchSignalCandidate[] = [];

  for (const outlier of input.outliers) {
    candidates.push({
      sourceEntityId: outlier.normalizedEntityId as ResearchSignalCandidate["sourceEntityId"],
      sourceSnapshotId: outlier.snapshotId as ResearchSignalCandidate["sourceSnapshotId"],
      signalType: "engagement_outlier" as ResearchSignalType,
      score: outlier.multiplier,
      payloadJson: {
        metricFactId: outlier.factId,
        value: outlier.value,
        median: outlier.median,
        multiplier: outlier.multiplier,
        shortcode: outlier.shortcode,
        caption: outlier.caption,
        insight: `${outlier.shortcode ?? outlier.factId} is ${outlier.multiplier.toFixed(1)}× own-account median.`,
      },
    });
  }

  for (const hook of input.hooks ?? []) {
    candidates.push({
      signalType: "caption_hook" as ResearchSignalType,
      score: hook.score,
      payloadJson: {
        caption: hook.caption,
        hookScore: hook.score,
        mocked: hook.mocked,
        rationale: hook.rationale,
      },
    });
  }

  if (input.brief) {
    candidates.push({
      signalType: "weekly_brief" as ResearchSignalType,
      score: input.brief.mocked ? 1 : 1,
      payloadJson: {
        text: input.brief.text,
        groundedIn: input.brief.groundedIn,
        mocked: input.brief.mocked,
      },
    });
  }

  if (input.competitor) {
    candidates.push({
      signalType: "competitor_graph" as ResearchSignalType,
      score: input.competitor.source === "graph" ? 1 : 0,
      payloadJson: {
        handle: input.competitor.handle,
        source: input.competitor.source,
        skippedReason: input.competitor.skippedReason,
      },
    });
  }

  return candidates;
}
