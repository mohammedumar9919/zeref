import { cn } from "@/lib/cn";
import type { DataAgeState } from "@/lib/data-age";

const COPY: Record<DataAgeState, string> = {
  fixture: "Fixture",
  live: "Live",
  stale: "Stale",
};

export function DataAgeBadge({
  state,
  className,
}: {
  state: DataAgeState;
  className?: string;
}): React.ReactElement {
  return (
    <span
      data-testid={`data-age-badge-${state}`}
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 font-mono text-[9px] uppercase leading-none tracking-[0.14em]",
        state === "live" && "border-hud-cyan/35 bg-hud-cyan/[0.07] text-hud-cyan",
        state === "stale" && "border-amber-400/45 bg-amber-400/10 text-amber-200",
        state === "fixture" && "border-hud-border/60 bg-panel/40 text-hud-muted",
        className,
      )}
    >
      {COPY[state]}
    </span>
  );
}

