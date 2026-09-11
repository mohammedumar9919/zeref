"use client";

import { GlobeIsland } from "@/components/globe/GlobeIsland";
import { useVoice } from "@/components/voice/VoiceProvider";

/**
 * Phase 6.2 wrapper — CSS pulse / sync rings + ≥58vh hero.
 * Does not touch PointCloudGlobe / WebGL internals (C104 / ADR-035).
 */
export function GlobeHero(): React.ReactElement {
  const { voiceState, brainState } = useVoice();

  return (
    <div
      data-testid="globe-hero"
      data-globe-voice-state={voiceState}
      data-globe-brain-state={brainState}
      className="globe-hero-tier3 relative flex min-h-[58vh] w-full flex-col"
    >
      <div
        data-testid="globe-voice-pulse"
        className="globe-voice-pulse-ring"
        aria-hidden
      />
      <div
        data-testid="globe-jarvis-sync"
        className="globe-jarvis-sync-rings"
        aria-hidden
      />
      <GlobeIsland />
    </div>
  );
}
