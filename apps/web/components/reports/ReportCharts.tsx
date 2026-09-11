import type { ReportChart } from "./report-view";

type ReportChartsProps = {
  charts: ReportChart[];
};

function HudBarChart({ chart }: { chart: ReportChart }): React.ReactElement {
  return (
    <div
      data-testid={`report-chart-${chart.id}`}
      className="rounded border border-hud-border bg-hud-surface/20 px-4 py-3"
    >
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-hud-muted">
        {chart.title}
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {chart.bars.map((bar) => {
          const pct = bar.max > 0 ? Math.min(100, Math.max(0, (bar.value / bar.max) * 100)) : 0;
          return (
            <li key={`${chart.id}-${bar.label}`}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
                  {bar.label}
                </span>
                <span className="font-mono text-[10px] text-hud-primary">
                  {Number.isInteger(bar.value) ? bar.value : bar.value.toFixed(2)}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-hud-cyan/10"
                role="img"
                aria-label={`${bar.label} ${bar.value} of ${bar.max}`}
              >
                <div
                  className="h-full rounded-full bg-hud-cyan/80 transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ReportCharts({ charts }: ReportChartsProps): React.ReactElement {
  return (
    <div
      data-testid="report-charts"
      className="grid gap-3 md:grid-cols-3"
    >
      {charts.map((chart) => (
        <HudBarChart key={chart.id} chart={chart} />
      ))}
    </div>
  );
}
