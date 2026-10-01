import type { MemoryEntry } from "@zeref/contracts";

export type SuspectedContradictionReason = "alias" | "negation" | "numeric";

export type SuspectedContradiction = {
  entryId: string;
  suspectedOfId: string;
  reason: SuspectedContradictionReason;
  confidence: number;
};

type Candidate = Pick<MemoryEntry, "entityId" | "valueKey" | "value" | "content"> & {
  id?: string;
};

const KEY_ALIASES: Record<string, string> = {
  besttimetopost: "postingtime",
  besttime: "postingtime",
  posttime: "postingtime",
  postingtime: "postingtime",
  niche: "topic",
  topic: "topic",
  engagementrate: "targeter",
  targetengagementrate: "targeter",
  targeter: "targeter",
};

const CONFIDENCE: Record<SuspectedContradictionReason, number> = {
  alias: 0.6,
  negation: 0.7,
  numeric: 0.8,
};

const NEGATIONS = new Set([
  "not",
  "never",
  "no",
  "dont",
  "doesnt",
  "didnt",
  "isnt",
  "arent",
  "wasnt",
  "werent",
  "wont",
  "cant",
]);

const AUXILIARIES = new Set(["do", "does", "did", "is", "are", "was", "were", "will", "can"]);

const NUMERIC = /^\s*(-?\d+(?:\.\d+)?)\s*(%|pm|am|k|m)?\s*$/i;

/** Lowercase, drop `_ - space`, then map known aliases to one canonical key. */
export function normalizeValueKey(key: string): string {
  const compact = key.toLowerCase().replace(/[\s_-]+/g, "");
  return KEY_ALIASES[compact] ?? compact;
}

function parseNumeric(value: string): { n: number; unit: string } | null {
  const m = NUMERIC.exec(value);
  if (!m) return null;
  return { n: Number(m[1]), unit: (m[2] ?? "").toLowerCase() };
}

function stem(token: string): string {
  return token.length > 3 && token.endsWith("s") && !token.endsWith("ss")
    ? token.slice(0, -1)
    : token;
}

function contentShape(text: string): { core: string; negated: boolean } {
  const tokens = text
    .toLowerCase()
    .replace(/'/g, "")
    .split(/[^a-z0-9%]+/)
    .filter(Boolean);
  let negations = 0;
  const kept: string[] = [];
  for (const [i, token] of tokens.entries()) {
    if (token === "longer" && tokens[i - 1] === "no") continue;
    if (NEGATIONS.has(token)) {
      negations += 1;
      continue;
    }
    if (AUXILIARIES.has(token)) continue;
    kept.push(stem(token));
  }
  return { core: kept.join(" "), negated: negations % 2 === 1 };
}

function sameNumber(a: string, b: string): boolean | null {
  const x = parseNumeric(a);
  const y = parseNumeric(b);
  if (!x || !y || x.unit !== y.unit) return null;
  return x.n === y.n;
}

/**
 * Deterministic near-miss detection. Results are suggestions for the user to
 * resolve; callers must never mark an entry `contradicted` from them.
 */
export function semanticContradictionCheck(
  candidate: Candidate,
  existing: MemoryEntry[],
): SuspectedContradiction[] {
  if (!candidate.entityId) return [];
  const entryId = candidate.id ?? "pending";
  const out: SuspectedContradiction[] = [];
  const push = (suspectedOfId: string, reason: SuspectedContradictionReason) =>
    out.push({ entryId, suspectedOfId, reason, confidence: CONFIDENCE[reason] });

  const candidateShape = candidate.content ? contentShape(candidate.content) : null;

  for (const entry of existing) {
    if (entry.id === candidate.id) continue;
    if (entry.observation === "contradicted") continue;
    if (entry.entityId !== candidate.entityId) continue;

    if (candidate.valueKey && entry.valueKey && candidate.value != null && entry.value != null) {
      if (normalizeValueKey(candidate.valueKey) === normalizeValueKey(entry.valueKey)) {
        const numeric = sameNumber(candidate.value, entry.value);
        if (numeric === true) continue;
        if (candidate.valueKey !== entry.valueKey) {
          if (candidate.value.trim().toLowerCase() !== entry.value.trim().toLowerCase()) {
            push(entry.id, "alias");
          }
          continue;
        }
        if (numeric === false) {
          push(entry.id, "numeric");
          continue;
        }
      }
    }

    if (candidateShape && entry.content) {
      const shape = contentShape(entry.content);
      if (
        shape.core.length > 0 &&
        shape.core === candidateShape.core &&
        shape.negated !== candidateShape.negated
      ) {
        push(entry.id, "negation");
      }
    }
  }

  return out;
}
