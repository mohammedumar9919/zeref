import { cn } from "@/lib/cn";
import type { DataAgeState } from "@/lib/data-age";
import { DataAgeBadge } from "@/components/hud/DataAgeBadge";

type CockpitPanelProps = {
  title: string;
  testId: string;
  focused?: boolean;
  className?: string;
  dataAgeState?: DataAgeState;
  children: React.ReactNode;
};

export function CockpitPanel({
  title,
  testId,
  focused = false,
  className,
  dataAgeState,
  children,
}: CockpitPanelProps): React.ReactElement {
  return (
    <section
      data-testid={testId}
      aria-label={title}
      className={cn(
        "hud-panel flex min-h-[140px] flex-col gap-2.5 p-3.5",
        focused && "ring-1 ring-hud-cyan/45",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-hud-border/35 pb-2">
        <h2 className="min-w-0 font-mono text-[10px] uppercase leading-none tracking-[0.22em] text-hud-cyan/90">
          {title}
        </h2>
        {dataAgeState ? <DataAgeBadge state={dataAgeState} /> : null}
      </div>
      {children}
    </section>
  );
}
