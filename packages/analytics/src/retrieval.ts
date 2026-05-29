import type { RetrievalItem } from "./types.js";

/** Cosine similarity; returns 0 when either vector has zero magnitude. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Rank corpus by similarity and return top-k neighbor IDs (descending). */
export function topKNeighborIds(
  query: number[],
  corpus: RetrievalItem[],
  k: number,
): string[] {
  const ranked = corpus
    .map((item) => ({
      id: item.id,
      score: cosineSimilarity(query, item.embedding),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.id.localeCompare(right.id);
    });

  return ranked.slice(0, k).map((row) => row.id);
}

/**
 * retrieval@k recall: fraction of expected IDs present in the top-k results.
 * C15 requires ≥ 1.0 on the phase-3 retrieval golden set.
 */
export function retrievalAtK(
  expectedIds: readonly string[],
  rankedIds: readonly string[],
  k: number,
): number {
  if (expectedIds.length === 0) return 1;
  const top = rankedIds.slice(0, k);
  const hits = expectedIds.filter((id) => top.includes(id)).length;
  return hits / expectedIds.length;
}
