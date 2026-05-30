"use client";

import type { ReactElement } from "react";

export default function CockpitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactElement {
  return (
    <div
      className="mx-auto max-w-xl px-4 py-16 text-center"
      data-testid="cockpit-load-error"
    >
      <p className="font-mono text-xs uppercase tracking-[0.35em] text-hud-cyan/80">
        Cockpit offline
      </p>
      <h1 className="mt-4 text-xl font-semibold text-hud-primary">
        Unable to load cockpit data
      </h1>
      <p className="mt-3 text-sm text-hud-muted">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded border border-hud-cyan/40 px-4 py-2 font-mono text-xs uppercase tracking-wider text-hud-cyan hover:bg-hud-cyan/10"
      >
        Retry
      </button>
    </div>
  );
}
