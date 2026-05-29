import { EliteCitationIndexEntrySchema, MetricFactIdSchema } from "@zeref/contracts";
import type { z } from "zod";

export type MetricFactCitationSource = {
  id: string;
  engagementScore?: string | null;
  insufficientData: boolean;
};

type CitationIndexEntry = z.infer<typeof EliteCitationIndexEntrySchema>;

const MF_MARKER = /\[mf:([0-9a-f-]{36})\]/gi;

/** Build citation index entries from metric facts used in elite sections. */
export function buildCitationIndex(
  facts: MetricFactCitationSource[],
): z.infer<typeof EliteCitationIndexEntrySchema>[] {
  const index: CitationIndexEntry[] = [];
  let n = 0;
  for (const fact of facts) {
    if (fact.insufficientData) continue;
    const score = fact.engagementScore != null ? Number(fact.engagementScore) : NaN;
    if (!Number.isFinite(score)) continue;
    n += 1;
    index.push({
      id: `c${n}`,
      metricFactId: MetricFactIdSchema.parse(fact.id),
      value: score,
    });
  }
  return index;
}

/** Lint narrative markdown: every [mf:uuid] must exist in citationIndex. */
export function lintNarrativeCitations(
  markdown: string,
  citationIndex: CitationIndexEntry[],
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const indexedIds = new Set(citationIndex.map((e) => e.metricFactId));
  const markers = [...markdown.matchAll(MF_MARKER)];
  for (const match of markers) {
    const id = match[1];
    if (!indexedIds.has(MetricFactIdSchema.parse(id))) {
      errors.push(`orphan citation marker [mf:${id}]`);
    }
  }
  const bareNumbers = markdown.replace(MF_MARKER, "").match(/\d+\.?\d*/g) ?? [];
  if (bareNumbers.length > 0 && citationIndex.length === 0) {
    errors.push("numeric claims without citationIndex");
  }
  return { ok: errors.length === 0, errors };
}

/** Default narrative markdown with metric fact markers (mock / deterministic). */
export function buildDefaultNarrativeMarkdown(
  engagementScore: number | null,
  metricFactId: string | undefined,
  insufficientData: boolean,
): string {
  if (insufficientData || engagementScore == null || !metricFactId) {
    return "Insufficient data to cite engagement metrics; expand scrape coverage.";
  }
  return `Engagement score is **${engagementScore.toFixed(2)}** [mf:${metricFactId}] vs account baseline.`;
}
