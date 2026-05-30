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
        "hud-panel flex min-h-[140px] flex-col gap-3 p-4",
        focused && "ring-1 ring-hud-cyan/40",
        className,
      )}
    >
      <h2 className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/90">
        {title}
      </h2>
      {children}
    </section>
  );
}
