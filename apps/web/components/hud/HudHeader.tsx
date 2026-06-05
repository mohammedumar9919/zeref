const STATUS_CHIPS = [
  "Online",
  "Secure",
  "RSC",
  "Phase 6.1",
] as const;

export function HudHeader(): React.ReactElement {
  return (
    <header
      data-testid="hud-header"
      className="hud-header border-b border-hud-border/60 bg-void/80 px-4 py-2 backdrop-blur-md md:px-6"
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 md:gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase leading-none tracking-[0.35em] text-hud-cyan/80">
            Zeref operator
          </p>
          <h1 className="mt-1.5 font-mono text-sm uppercase leading-tight tracking-[0.2em] text-hud-primary md:text-base">
            Command center HUD
          </h1>
        </div>
        <ul
          className="flex flex-wrap items-center gap-1.5"
          aria-label="System status"
        >
          {STATUS_CHIPS.map((label) => (
            <li
              key={label}
              className="status-chip inline-flex items-center gap-1.5 rounded border border-hud-cyan/35 bg-hud-cyan/[0.07] px-2 py-0.5 font-mono text-[10px] uppercase leading-none tracking-[0.18em] text-hud-cyan"
            >
              <span
                className="inline-block size-1 shrink-0 rounded-full bg-hud-cyan shadow-[0_0_6px_var(--accent-glow)]"
                aria-hidden
              />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
