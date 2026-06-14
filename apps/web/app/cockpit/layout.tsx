import type { ReactNode } from "react";

import { VoiceHudShell } from "@/components/hud/VoiceHudShell";
import { VoiceProvider } from "@/components/voice/VoiceProvider";

/** Cockpit reads live BFF data — never prerender with blocking fetch (C27). */
export const dynamic = "force-dynamic";

export default function CockpitLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <VoiceProvider>
      <VoiceHudShell>{children}</VoiceHudShell>
    </VoiceProvider>
  );
}
