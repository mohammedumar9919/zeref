import { GlobeIsland } from "@/components/globe/GlobeIsland";

/**
 * Phase 6.2 wrapper — CSS pulse / sync rings + ≥58vh hero.
 * Does not touch PointCloudGlobe / WebGL internals (C104 / ADR-035).
 * Voice/brain attrs default idle; live state is read from GlobeIsland via :has().
 */
export function GlobeHero(): React.ReactElement {
  return (
    <div
      data-testid="globe-hero"
      data-globe-voice-state="idle"
      data-globe-brain-state="idle"
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
