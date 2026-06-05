import type { ResearchSignalCandidate, ResearchSignalType } from "@zeref/contracts";

export type ResearchMetricFactInput = {
  id: string;
  normalizedEntityId: string;
  snapshotId: string;
  engagementScore: number | null;
  insufficientData: boolean;
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
