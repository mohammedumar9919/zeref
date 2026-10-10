/** Reciprocal Rank Fusion constant (Cormack et al.); score = Σ 1 / (k + rank). */
export const RRF_K = 60;

/** Candidates taken from each of the lexical and vector lists before fusion. */
export const HYBRID_CANDIDATES = 20;

export type EmbedFn = (text: string) => Promise<number[]>;

export type FusedItem = { id: string; score: number };

/**
 * Fuse ranked id lists with RRF (1-based ranks). A duplicate id within one list
 * counts once at its best rank. Ties keep first-appearance order.
 */
export function fuseRrf(
  lists: ReadonlyArray<ReadonlyArray<string>>,
  k: number = RRF_K,
): FusedItem[] {
  if (!Number.isFinite(k) || k < 0) {
    throw new RangeError(`RRF k must be a non-negative number, got ${k}`);
  }
  const scores = new Map<string, number>();
  for (const list of lists) {
    const seen = new Set<string>();
    list.forEach((id, index) => {
      if (seen.has(id)) return;
      seen.add(id);
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + index + 1));
    });
  }
  return [...scores]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

/** Embedding errors never propagate: `null` means "no vector side". */
export async function tryEmbed(
  embed: EmbedFn | undefined,
  text: string,
): Promise<number[] | null> {
  if (!embed) return null;
  try {
    const vector = await embed(text);
    return Array.isArray(vector) && vector.length > 0 ? vector : null;
  } catch {
    return null;
  }
}

export type HybridFuseInput = {
  query: string;
  /** Lexical matches, best first. */
  lexicalIds: readonly string[];
  embed?: EmbedFn;
  /** Nearest entry ids for the query embedding, best first. */
  vectorSearch: (embedding: number[], limit: number) => Promise<string[]>;
  candidates?: number;
  k?: number;
};

/**
 * Lexical top-N ∪ vector top-N → RRF. Returns `null` when the vector side is
 * unavailable (no embedder, blank query, embed or vector-search failure); the
 * caller then keeps its lexical ranking. There is no vector-only result.
 */
export async function hybridFuse(input: HybridFuseInput): Promise<FusedItem[] | null> {
  const query = input.query.trim();
  if (!query || !input.embed) return null;

  const embedding = await tryEmbed(input.embed, query);
  if (!embedding) return null;

  const candidates = input.candidates ?? HYBRID_CANDIDATES;
  let vectorIds: string[];
  try {
    vectorIds = await input.vectorSearch(embedding, candidates);
  } catch {
    return null;
  }

  return fuseRrf(
    [input.lexicalIds.slice(0, candidates), vectorIds.slice(0, candidates)],
    input.k ?? RRF_K,
  );
}
