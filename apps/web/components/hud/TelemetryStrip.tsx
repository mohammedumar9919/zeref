"use client";

import { useEffect, useState } from "react";

import { parseTelemetryEvent } from "@/lib/events";
import {
  parsePipelineEvent,
  parseVoiceStateEvent,
} from "@/lib/voice/parse-voice-events";

import { useVoice } from "../voice/VoiceProvider";

export function TelemetryStrip(): React.ReactElement {
  const { telemetryLive: voiceTelemetryLive } = useVoice();
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

    source.addEventListener("voice.state", (event) => {
      try {
        parseVoiceStateEvent(JSON.parse(event.data));
        setSimulated(false);
      } catch {
        /* ignore */
      }
    });

    source.addEventListener("pipeline", (event) => {
      try {
        const parsed = parsePipelineEvent(JSON.parse(event.data));
        if (!parsed.simulated) setSimulated(false);
      } catch {
        /* ignore */
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

  const showSimulated = simulated && !voiceTelemetryLive;

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
        {message}
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
