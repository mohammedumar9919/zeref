"use client";

import { VoiceProvider } from "@/components/voice/VoiceProvider";

import { HudShell } from "./HudShell";

type VoiceHudShellProps = {
  children: React.ReactNode;
};

export function VoiceHudShell({
  children,
}: VoiceHudShellProps): React.ReactElement {
  return (
    <VoiceProvider>
      <HudShell>{children}</HudShell>
    </VoiceProvider>
  );
}
