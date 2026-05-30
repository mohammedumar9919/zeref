export function AudioIoPlaceholder(): React.ReactElement {
  return (
    <div
      data-testid="audio-io-simulated"
      className="audio-io flex shrink-0 flex-col gap-1 rounded border border-hud-border/50 bg-panel/30 px-3 py-2 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/70">
          Audio I/O
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-amber-200">
          SIMULATED
        </span>
      </div>
      <div
        aria-hidden
        className="flex h-6 items-end justify-center gap-0.5 opacity-60"
      >
        {[3, 5, 8, 5, 10, 6, 4, 7, 5, 3].map((h, i) => (
          <span
            key={i}
            className="w-1 rounded-sm bg-hud-cyan/50"
            style={{ height: `${h * 2}px` }}
          />
        ))}
      </div>
    </div>
  );
}
