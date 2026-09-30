"use client";

import { useVoice } from "@/components/voice/VoiceProvider";

import { HudFooter } from "./HudFooter";
import { HudHeader } from "./HudHeader";

type HudShellProps = {
  children: React.ReactNode;
};

export function HudShell({ children }: HudShellProps): React.ReactElement {
  const { brainState } = useVoice();

  return (
    <div
      data-brain-state={brainState}
      className="cockpit-hud cockpit-hud--tier3 flex min-h-[calc(100vh-3.25rem)] flex-col"
    >
      <HudHeader />
      <div className="flex-1">{children}</div>
      <HudFooter />
    </div>
  );
}
