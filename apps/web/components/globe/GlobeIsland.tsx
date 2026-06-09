"use client";

import dynamic from "next/dynamic";

import { useVoice } from "@/components/voice/VoiceProvider";

import { GLOBE_MODE } from "./GlobeCanvas";

const GlobeCanvas = dynamic(
  () => import("./GlobeCanvas").then((m) => ({ default: m.GlobeCanvas })),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        data-testid="globe-loading"
        className="flex h-full min-h-[45vh] w-full items-center justify-center"
      >
        <div className="h-32 w-32 animate-pulse rounded-full border border-hud-cyan/20 bg-hud-cyan/5" />
      </div>
    ),
  },
);

export function GlobeIsland(): React.ReactElement {
  const { voiceState, brainState, outputLevel } = useVoice();

  return (
    <div
      data-testid="globe-island"
      data-globe-mode={GLOBE_MODE}
      data-globe-voice-state={voiceState}
      data-globe-brain-state={brainState}
      className={`globe-hero globe-voice-${voiceState} globe-brain-${brainState} relative min-h-[45vh] w-full overflow-hidden lg:min-h-[55vh]`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.08),transparent_65%)]" />
      <div className="absolute inset-0">
        <GlobeCanvas
          voiceState={voiceState}
          brainState={brainState}
          outputLevel={outputLevel}
        />
      </div>
    </div>
  );
}
