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
        className="hud-footer border-t border-hud-border/60 bg-void/80 px-4 py-3 backdrop-blur-md md:px-6"
      >
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-hud-muted">
            Objective · Instagram ops intelligence · Jarvis PTT
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:flex-1 lg:justify-end">
            <PttButton />
            <TelemetryStrip />
            <AudioIoLive />
          </div>
        </div>
      </footer>
    </>
  );
}
