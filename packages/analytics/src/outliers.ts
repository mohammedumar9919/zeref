export const DEFAULT_OUTLIER_MULTIPLIER = 5;

export type OutlierFact = {
  id: string;
  normalizedEntityId: string;
  snapshotId?: string;
  value: number;
  caption?: string;
  shortcode?: string;
};

export type EngagementOutlier = {
  factId: string;
  normalizedEntityId: string;
  snapshotId?: string;
  value: number;
  median: number;
  multiplier: number;
  shortcode?: string;
  caption?: string;
};

export type OutlierScanResult = {
  median: number | null;
  outliers: EngagementOutlier[];
};

function finiteValues(facts: OutlierFact[]): number[] {
  return facts
    .map((fact) => fact.value)
    .filter((value) => typeof value === "number" && Number.isFinite(value) && value > 0);
}

/** Inclusive median of a numeric list. */
export function median(values: number[]): number | null {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .slice()
    .sort((a, b) => a - b);
  if (sorted.length === 0) {
    return null;
  }
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Own-account outlier scan: flag facts whose value is ≥ multiplier × median.
 * Default multiplier is 5× (CLOUD-A3).
 */
export function findEngagementOutliers(
  facts: OutlierFact[],
  options?: { multiplier?: number },
): OutlierScanResult {
  const threshold = options?.multiplier ?? DEFAULT_OUTLIER_MULTIPLIER;
  const values = finiteValues(facts);
  const mid = median(values);
  if (mid == null || mid <= 0) {
    return { median: mid, outliers: [] };
  }

  const outliers: EngagementOutlier[] = [];
  for (const fact of facts) {
    if (!Number.isFinite(fact.value) || fact.value <= 0) {
      continue;
    }
    const multiplier = fact.value / mid;
    if (multiplier + Number.EPSILON < threshold) {
      continue;
    }
    outliers.push({
      factId: fact.id,
      normalizedEntityId: fact.normalizedEntityId,
      snapshotId: fact.snapshotId,
      value: fact.value,
      median: mid,
      multiplier: Number(multiplier.toFixed(4)),
      shortcode: fact.shortcode,
      caption: fact.caption,
    });
  }

  return { median: mid, outliers };
}

/** Prefer likes / raw engagement from factsJson, else normalized engagementScore. */
export function outlierValueFromFact(input: {
  engagementScore: number | null;
  factsJson?: Record<string, unknown>;
}): number | null {
  const json = input.factsJson ?? {};
  for (const key of ["likes", "rawEngagement", "likeCount", "impressions"] as const) {
    const raw = json[key];
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      return raw;
    }
  }
  if (input.engagementScore != null && Number.isFinite(input.engagementScore)) {
    return input.engagementScore;
  }
  return null;
}
