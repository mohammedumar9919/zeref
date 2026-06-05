"use client";

import { AudioIoLive } from "@/components/voice/AudioIoLive";
import { PttButton } from "@/components/voice/PttButton";
import { TranscriptPanel } from "@/components/voice/TranscriptPanel";

import { TelemetryStrip } from "./TelemetryStrip";

export function HudFooter(): React.ReactElement {
  return (
    <>
      <TranscriptPanel />
      <footer
        data-testid="hud-footer"
        className="hud-footer border-t border-hud-border/60 bg-void/80 px-4 py-2.5 backdrop-blur-md md:px-6"
      >
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between lg:gap-4">
          <div className="hud-footer-objective flex min-w-0 flex-col justify-center gap-0.5 border-hud-border/40 lg:border-r lg:pr-4">
            <span className="font-mono text-[10px] uppercase leading-none tracking-[0.28em] text-hud-cyan/70">
              Objective
            </span>
            <p className="font-mono text-[11px] uppercase leading-snug tracking-[0.12em] text-hud-muted">
              Instagram ops intelligence · Jarvis PTT
            </p>
          </div>
          <div className="hud-footer-telemetry-row flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3 lg:flex-1 lg:justify-end lg:gap-4">
            <PttButton />
            <TelemetryStrip />
            <AudioIoLive />
          </div>
        </div>
      </footer>
    </>
  );
}
