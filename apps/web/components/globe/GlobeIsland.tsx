"use client";

import dynamic from "next/dynamic";

const GlobeCanvas = dynamic(
  () => import("./GlobeCanvas").then((m) => ({ default: m.GlobeCanvas })),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        data-testid="globe-loading"
        className="flex h-full min-h-[280px] w-full items-center justify-center"
      >
        <div className="h-32 w-32 animate-pulse rounded-full border border-hud-cyan/20 bg-hud-cyan/5" />
      </div>
    ),
  },
);

export function GlobeIsland(): React.ReactElement {
  return (
    <div
      data-testid="globe-island"
      className="hud-panel relative min-h-[280px] overflow-hidden p-0 lg:min-h-[420px]"
    >
      <p className="pointer-events-none absolute left-4 top-4 z-10 font-mono text-[10px] uppercase tracking-widest text-hud-cyan/70">
        Command globe
      </p>
      <div className="absolute inset-0">
        <GlobeCanvas />
      </div>
    </div>
  );
}
