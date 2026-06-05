export function AudioIoPlaceholder(): React.ReactElement {
  return (
    <div
      data-testid="audio-io-simulated"
      className="audio-io flex shrink-0 flex-col gap-1.5 rounded border border-hud-border/50 bg-panel/40 px-3 py-2 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase leading-none tracking-[0.22em] text-hud-cyan/80">
          Audio I/O
        </span>
        <span className="font-mono text-[9px] uppercase leading-none tracking-[0.14em] text-amber-200">
          SIMULATED
        </span>
      </div>
      <div
        aria-hidden
        className="audio-io-waveform flex h-6 items-end justify-center gap-0.5"
      >
        {[3, 5, 8, 5, 10, 6, 4, 7, 5, 3].map((h, i) => (
          <span
            key={i}
            className="w-1 rounded-sm bg-hud-cyan/55 shadow-[0_0_4px_var(--accent-glow)]"
            style={{ height: `${h * 2}px` }}
          />
        ))}
      </div>
      <p className="font-mono text-[9px] uppercase leading-none tracking-[0.12em] text-hud-muted/80">
        48kHz · 24-bit · stub
      </p>
    </div>
  );
}
