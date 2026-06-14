"use client";

import { useVoice } from "../voice/VoiceProvider";

export function TelemetryStrip(): React.ReactElement {
  const {
    telemetryLive: voiceTelemetryLive,
    telemetryMessage,
    telemetrySimulated,
  } = useVoice();

  const showSimulated = telemetrySimulated && !voiceTelemetryLive;

  return (
    <div
      className="telemetry-strip flex min-w-0 flex-1 items-center gap-2.5 rounded border border-hud-border/50 bg-panel/40 px-3 py-2 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <span className="shrink-0 font-mono text-[10px] uppercase leading-none tracking-[0.22em] text-hud-cyan/80">
        Telemetry
      </span>
      <span
        className="hidden h-3 w-px shrink-0 bg-hud-cyan/25 sm:block"
        aria-hidden
      />
      <p className="min-w-0 flex-1 truncate font-mono text-[10px] leading-tight tracking-wide text-hud-muted tabular-nums">
        {telemetryMessage}
      </p>
      {showSimulated ? (
        <span
          data-testid="telemetry-simulated"
          className="shrink-0 rounded border border-amber-400/45 bg-amber-400/10 px-1.5 py-px font-mono text-[9px] uppercase leading-none tracking-[0.14em] text-amber-200"
        >
          SIMULATED
        </span>
      ) : null}
    </div>
  );
}
