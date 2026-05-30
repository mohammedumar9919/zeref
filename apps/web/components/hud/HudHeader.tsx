export function HudHeader(): React.ReactElement {
  return (
    <header
      data-testid="hud-header"
      className="hud-header border-b border-hud-border/60 bg-void/80 px-4 py-3 backdrop-blur-md md:px-6"
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-hud-cyan/80">
            Zeref operator
          </p>
          <h1 className="mt-1 font-mono text-sm uppercase tracking-widest text-hud-primary md:text-base">
            Command center HUD
          </h1>
        </div>
        <ul className="flex flex-wrap items-center gap-2">
          {["Online", "Secure", "RSC", "Phase 5.1"].map((label) => (
            <li
              key={label}
              className="rounded border border-hud-cyan/30 bg-hud-cyan/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-hud-cyan"
            >
              {label}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
