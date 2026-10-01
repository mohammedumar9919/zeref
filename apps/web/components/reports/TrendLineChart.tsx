import { ENGAGEMENT_TREND_MIN_SCORED, type EngagementTrend } from "@zeref/contracts";

import { scaleSeries, scaleValue, type ChartBox } from "./chart-math";

const BOX: ChartBox = { width: 720, height: 220, padding: 28 };

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TrendLineChart({ trend }: { trend: EngagementTrend }): React.ReactElement {
  const scored = trend.points.filter(
    (p): p is typeof p & { engagementScore: number } => typeof p.engagementScore === "number",
  );
  const values = scored.map((p) => p.engagementScore);
  const usesCollectTime = scored.some((p) => p.timeBasis === "collected");

  return (
    <section
      data-testid="report-trend-engagement"
      className="rounded border border-hud-border bg-hud-surface/20 px-4 py-3"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-hud-muted">
          Engagement per post
        </h3>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
          {trend.median !== null ? (
            <span data-testid="report-trend-median" className="text-amber-300">
              Your median {formatScore(trend.median)}
            </span>
          ) : null}
          {trend.source === "fixture" ? (
            <span className="rounded border border-hud-cyan/35 px-1.5 py-0.5 text-hud-cyan">
              Fixture
            </span>
          ) : null}
        </div>
      </header>

      {trend.insufficientData ? (
        <p data-testid="report-trend-insufficient" className="mt-3 text-sm text-hud-muted">
          Not enough posts yet — the trend appears after {ENGAGEMENT_TREND_MIN_SCORED} scored
          posts.
        </p>
      ) : (
        <TrendSvg points={scored} values={values} median={trend.median} />
      )}

      {usesCollectTime ? (
        <p className="mt-2 text-sm text-hud-muted">
          Some posts have no publish time; they are placed at their collect time.
        </p>
      ) : null}
    </section>
  );
}

function TrendSvg({
  points,
  values,
  median,
}: {
  points: Array<{ entityId: string; title: string; at: string; engagementScore: number }>;
  values: number[];
  median: number | null;
}): React.ReactElement {
  const scaled = scaleSeries(values, BOX);
  const medianY = median !== null ? scaleValue(median, values, BOX) : null;
  const first = points[0];
  const last = points[points.length - 1];
  const label = `Engagement per post from ${formatDay(first.at)} to ${formatDay(last.at)}${
    median !== null ? `, median ${formatScore(median)}` : ""
  }`;

  return (
    <svg
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      role="img"
      aria-label={label}
      className="mt-3 h-auto w-full"
    >
      {medianY !== null ? (
        <line
          data-testid="report-trend-median-line"
          x1={BOX.padding}
          x2={BOX.width - BOX.padding}
          y1={medianY}
          y2={medianY}
          stroke="#fcd34d"
          strokeWidth={1.5}
          strokeDasharray="6 5"
        />
      ) : null}
      <polyline
        fill="none"
        stroke="#22d3ee"
        strokeWidth={2.5}
        strokeLinejoin="round"
        points={scaled.map((p) => `${p.x},${p.y}`).join(" ")}
      />
      {scaled.map((p, i) => (
        <circle key={points[i].entityId} cx={p.x} cy={p.y} r={4} fill="#22d3ee">
          <title>{`${points[i].title}: ${formatScore(points[i].engagementScore)}`}</title>
        </circle>
      ))}
      <text x={BOX.padding} y={BOX.height - 6} fill="#94a3b8" fontSize={14} fontFamily="monospace">
        {formatDay(first.at)}
      </text>
      <text
        x={BOX.width - BOX.padding}
        y={BOX.height - 6}
        fill="#94a3b8"
        fontSize={14}
        fontFamily="monospace"
        textAnchor="end"
      >
        {formatDay(last.at)}
      </text>
    </svg>
  );
}
