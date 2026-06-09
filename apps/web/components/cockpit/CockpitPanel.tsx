import { cn } from "@/lib/cn";

type CockpitPanelProps = {
  title: string;
  testId: string;
  focused?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function CockpitPanel({
  title,
  testId,
  focused = false,
  className,
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
      <h2 className="border-b border-hud-border/35 pb-2 font-mono text-[10px] uppercase leading-none tracking-[0.22em] text-hud-cyan/90">
        {title}
      </h2>
      {children}
    </section>
  );
}
