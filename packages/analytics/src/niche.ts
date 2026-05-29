import type { NormalizedPostFields } from "./types.js";

/** Niche pillar tags for motorcycle / ride content (Phase 3). */
export const NICHE_PILLARS = [
  "edits",
  "ride_log",
  "night_ride",
  "builds",
  "group_ride",
] as const;

export type NichePillar = (typeof NICHE_PILLARS)[number];

const PILLAR_PATTERNS: ReadonlyArray<{ pillar: NichePillar; patterns: RegExp[] }> = [
  {
    pillar: "edits",
    patterns: [/\bedit(s|ing)?\b/i, /\btransition(s)?\b/i, /\bremix\b/i],
  },
  {
    pillar: "ride_log",
    patterns: [
      /\bride\s*log\b/i,
      /\bodometer\b/i,
      /\b\d+\s*(mi|miles|km)\b/i,
    ],
  },
  {
    pillar: "night_ride",
    patterns: [/\bnight\s*ride\b/i, /\bmidnight\b/i, /\bafter\s*dark\b/i],
  },
  {
    pillar: "builds",
    patterns: [/\bcustom\s*build\b/i, /\bbuild\b/i, /\bwrench(ing)?\b/i],
  },
  {
    pillar: "group_ride",
    patterns: [/\bgroup\s*ride\b/i, /\bpack\s*ride\b/i, /\bsquad\s*ride\b/i],
  },
];

/**
 * Keyword pillar tags from caption text (deterministic, order stable).
 */
export function detectNichePillars(fields: NormalizedPostFields): NichePillar[] {
  const text = fields.caption?.trim();
  if (!text) return [];

  const matched = new Set<NichePillar>();
  for (const { pillar, patterns } of PILLAR_PATTERNS) {
    if (patterns.some((re) => re.test(text))) {
      matched.add(pillar);
    }
  }

  return NICHE_PILLARS.filter((pillar) => matched.has(pillar));
}
