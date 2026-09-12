import type { ResearchIntel } from "@zeref/contracts";

type ResearchIntelPanelProps = {
  intel: ResearchIntel;
};

function formatMultiplier(value: number): string {
  return `${value.toFixed(1).replace(/\.0$/, "")}×`;
}

export function ResearchIntelPanel({ intel }: ResearchIntelPanelProps): React.ReactElement {
  const brief = intel.weeklyBrief;

  return (
    <section
      data-testid="research-intel"
      className="flex flex-col gap-4 rounded border border-hud-border bg-hud-surface/20 px-4 py-4"
    >
      <header className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/90">
          Research intel
        </p>
        <h3 className="text-sm font-medium text-hud-primary">
          Own-account outliers + weekly brief
        </h3>
        <p className="text-sm text-hud-muted">
          Posts at or above 5× own-account median from metric facts. Caption hooks are 0–10
          and mockable.
        </p>
      </header>

      <div data-testid="research-outliers" className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-hud-muted">
          Outliers ({intel.outliers.length})
        </p>
        {intel.outliers.length === 0 ? (
          <p
            data-testid="research-outliers-empty"
            className="text-sm text-hud-muted"
          >
            No own-account post cleared the 5× median bar in this window.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {intel.outliers.map((outlier) => (
              <li
                key={outlier.factId}
                data-testid={`research-outlier-${outlier.shortcode ?? outlier.factId}`}
                className="rounded border border-hud-border/70 bg-void/40 px-3 py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
                    {outlier.shortcode ?? outlier.factId.slice(0, 8)}
                  </span>
                  <span className="font-mono text-[10px] text-hud-primary">
                    {formatMultiplier(outlier.multiplier)} median
                  </span>
                </div>
                <p className="mt-1 text-sm text-hud-primary">
                  {outlier.value} vs median {outlier.median}
                </p>
                {outlier.caption ? (
                  <p className="mt-1 text-sm text-hud-muted">{outlier.caption}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {intel.hooks.length > 0 ? (
        <div data-testid="research-hook-scores" className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-hud-muted">
            Caption hook scores
          </p>
          <ul className="flex flex-col gap-2">
            {intel.hooks.map((hook, index) => (
              <li
                key={`${hook.caption}-${index}`}
                data-testid={`research-hook-${index}`}
                className="rounded border border-hud-border/70 bg-void/40 px-3 py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-sm text-hud-primary">{hook.caption}</span>
                  <span className="font-mono text-[10px] text-hud-cyan">
                    {hook.score}/10{hook.mocked ? " · mocked" : ""}
                  </span>
                </div>
                {hook.rationale ? (
                  <p className="mt-1 text-sm text-hud-muted">{hook.rationale}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {brief ? (
        <article
          data-testid="research-weekly-brief"
          className="rounded border border-hud-cyan/30 bg-hud-cyan/5 px-3 py-3"
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/90">
            Weekly brief{brief.mocked ? " · mocked" : ""}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-hud-primary">{brief.text}</p>
          {brief.groundedIn.length > 0 ? (
            <p className="mt-2 font-mono text-[10px] text-hud-muted">
              Grounded in {brief.groundedIn.join(", ")}
            </p>
          ) : null}
        </article>
      ) : null}

      {intel.competitor ? (
        <p
          data-testid="research-competitor-fixture"
          className="font-mono text-[10px] text-hud-muted"
        >
          Competitor {intel.competitor.handle} · {intel.competitor.source}
          {intel.competitor.skippedReason ? ` — ${intel.competitor.skippedReason}` : ""}
        </p>
      ) : null}
    </section>
  );
}
