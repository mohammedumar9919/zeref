import type { ReactNode } from "react";

import { DataModeProvider } from "@/components/hud/DataModeProvider";
import { VoiceHudShell } from "@/components/hud/VoiceHudShell";
import { VoiceProvider } from "@/components/voice/VoiceProvider";
import { resolveDataMode } from "@/lib/data-mode";

/** Cockpit reads live BFF data — never prerender with blocking fetch (C27). */
export const dynamic = "force-dynamic";

export default function CockpitLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <DataModeProvider mode={resolveDataMode()}>
      <VoiceProvider>
        <VoiceHudShell>{children}</VoiceHudShell>
      </VoiceProvider>
    </DataModeProvider>
  );
}
