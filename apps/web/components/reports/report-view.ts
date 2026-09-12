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

export type ReportChart = {
  id: "engagement" | "recommendations" | "citations";
  title: string;
  bars: ReportChartBar[];
};

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
  const vsWeight =
    report.engagement.vsCohort === "above"
      ? 75
      : report.engagement.vsCohort === "below"
        ? 25
        : report.engagement.vsCohort === "inline"
          ? 50
          : 0;

  const engagement: ReportChart = {
    id: "engagement",
    title: "Engagement",
    bars: [
      {
        label: "score",
        value: typeof score === "number" ? score : 0,
        max: engagementMax,
      },
      {
        label: `vs ${report.engagement.vsCohort}`,
        value: vsWeight,
        max: engagementMax,
      },
    ],
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

  const citations: ReportChart = {
    id: "citations",
    title: "Cited facts",
    bars: report.narrative.citationIndex.map((entry) => ({
      label: entry.id,
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
