export type ResearchPayloadCard = {
  key: string;
  label: string;
  value: string;
};

const LABEL_ALIASES: Record<string, string> = {
  metricFactId: "Metric fact",
  engagementScore: "Engagement score",
  embeddingCount: "Embedding count",
  model: "Model",
  insight: "Insight",
  window: "Window",
  sampleSize: "Sample size",
};

function humanizeKey(key: string): string {
  if (LABEL_ALIASES[key]) return LABEL_ALIASES[key];
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatValue(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return null;
}

/** Flatten payloadJson into operator-readable cards (no raw JSON blobs). */
export function researchPayloadToCards(payload: Record<string, unknown>): ResearchPayloadCard[] {
  if (!payload || typeof payload !== "object") return [];
  const cards: ResearchPayloadCard[] = [];
  for (const [key, raw] of Object.entries(payload)) {
    const value = formatValue(raw);
    if (!value) continue;
    cards.push({
      key,
      label: humanizeKey(key),
      value,
    });
  }
  return cards;
}
