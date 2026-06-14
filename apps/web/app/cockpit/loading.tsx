/** Instant cockpit feel — route-level Suspense fallback (C132). */
export default function CockpitLoading(): React.ReactElement {
  return (
    <div
      data-testid="cockpit-loading"
      className="mx-auto max-w-[1600px] animate-pulse space-y-4 px-4 py-6 md:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-hud-muted">
        Loading cockpit…
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {(["studio", "calendar", "reports", "research"] as const).map((panel) => (
          <div
            key={panel}
            data-testid={`cockpit-loading-${panel}`}
            className="h-32 rounded border border-hud-border/40 bg-hud-panel/30"
          />
        ))}
      </div>
    </div>
  );
}
