export type EliteReportLike = {
  headline: { text: string; insufficientData?: boolean };
  engagement: {
    score: number | null;
    vsCohort: "above" | "below" | "inline" | "unknown" | string;
    citations?: Array<{ metricFactId: string; label: string }>;
  };
  niche?: { pillars: string[] };
  cohort?: { label: string; sampleSize: number };
  recommendations: Array<{ text: string; priority: "high" | "medium" | "low" | string }>;
  narrative: {
    markdown: string;
    citationIndex: Array<{ id: string; metricFactId: string; value: number }>;
  };
  insufficientData?: boolean;
};

export type ReportChartBar = {
  label: string;
  value: number;
  max: number;
};

export type ReportComparison = {
  label: string;
  /** Baseline sample note, only when the report exposes the cohort size. */
  baseline?: string;
  lowConfidence: boolean;
};

export type ReportChart = {
  id: "engagement" | "recommendations" | "citations";
  title: string;
  bars: ReportChartBar[];
  comparison?: ReportComparison;
};

const LOW_CONFIDENCE_SAMPLE = 5;

/** `vsCohort` is categorical; it is shown as words, never as a bar value. */
export function describeVsCohort(vsCohort: string): string {
  switch (vsCohort) {
    case "above":
      return "Above your usual";
    case "inline":
      return "In line with your usual";
    case "below":
      return "Below your usual";
    default:
      return "Not enough history";
  }
}

export function buildComparison(report: EliteReportLike): ReportComparison {
  const sampleSize = report.cohort?.sampleSize;
  const hasSample = typeof sampleSize === "number" && Number.isFinite(sampleSize);
  const lowConfidence = hasSample && sampleSize < LOW_CONFIDENCE_SAMPLE;
  return {
    label: describeVsCohort(report.engagement.vsCohort),
    baseline: hasSample
      ? `vs ${sampleSize} ${sampleSize === 1 ? "post" : "posts"}${lowConfidence ? " — low confidence" : ""}`
      : undefined,
    lowConfidence,
  };
}

/** Strip markdown emphasis and raw metric-fact tokens for operator reading. */
export function formatEliteNarrative(report: EliteReportLike): string {
  const raw = report.narrative?.markdown ?? "";
  return raw
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[mf:[0-9a-f-]{36}\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildReportCharts(report: EliteReportLike): ReportChart[] {
  const score = report.engagement.score;
  const engagementMax = 100;

  const engagement: ReportChart = {
    id: "engagement",
    title: "Engagement",
    bars:
      typeof score === "number"
        ? [{ label: "score", value: score, max: engagementMax }]
        : [],
    comparison: buildComparison(report),
  };

  const priorityCounts = { high: 0, medium: 0, low: 0 };
  for (const rec of report.recommendations) {
    if (rec.priority === "high" || rec.priority === "medium" || rec.priority === "low") {
      priorityCounts[rec.priority] += 1;
    }
  }
  const recMax = Math.max(1, ...Object.values(priorityCounts));
  const recommendations: ReportChart = {
    id: "recommendations",
    title: "Recommendations",
    bars: (["high", "medium", "low"] as const).map((label) => ({
      label,
      value: priorityCounts[label],
      max: recMax,
    })),
  };

  const citationLabels = new Map(
    (report.engagement.citations ?? []).map((c) => [c.metricFactId, c.label]),
  );
  const citations: ReportChart = {
    id: "citations",
    title: `Facts cited: ${report.narrative.citationIndex.length}`,
    bars: report.narrative.citationIndex.map((entry, index) => ({
      label: citationLabels.get(entry.metricFactId) ?? `Fact ${index + 1}`,
      value: entry.value,
      max: Math.max(100, ...report.narrative.citationIndex.map((c) => c.value), 1),
    })),
  };

  return [engagement, recommendations, citations];
}

export function suggestHooksFromReport(report: EliteReportLike): string[] {
  const hooks: string[] = [];
  if (report.headline.text.trim()) {
    hooks.push(report.headline.text.trim());
  }
  for (const rec of report.recommendations) {
    if (rec.text.trim() && !hooks.includes(rec.text.trim())) {
      hooks.push(rec.text.trim());
    }
  }
  return hooks;
}
