"use client";

import { useEffect, useState } from "react";

import { parseTelemetryEvent } from "@/lib/events";

export function TelemetryStrip(): React.ReactElement {
  const [message, setMessage] = useState("Awaiting telemetry stream…");
  const [simulated, setSimulated] = useState(true);

  useEffect(() => {
    const source = new EventSource("/api/v1/events/stream");

    source.addEventListener("telemetry", (event) => {
      try {
        const parsed = parseTelemetryEvent(JSON.parse(event.data));
        setMessage(parsed.message);
        setSimulated(parsed.simulated);
      } catch {
        setMessage("Telemetry parse error");
      }
    });

    source.onerror = () => {
      setMessage("Telemetry stream unavailable");
      setSimulated(true);
    };

    return () => {
      source.close();
    };
  }, []);

  return (
    <div className="telemetry-strip flex min-w-0 flex-1 items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/70">
        Telemetry
      </span>
      <p className="truncate font-mono text-[10px] text-hud-muted">{message}</p>
      {simulated ? (
        <span
          data-testid="telemetry-simulated"
          className="shrink-0 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-200"
        >
          SIMULATED
        </span>
      ) : null}
    </div>
  );
}
