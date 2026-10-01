"use client";

import { HudShell } from "./HudShell";
import { TypedComposer } from "./TypedComposer";

type VoiceHudShellProps = {
  children: React.ReactNode;
};

/** HUD chrome only — VoiceProvider lives in cockpit/layout.tsx (C125). */
export function VoiceHudShell({
  children,
}: VoiceHudShellProps): React.ReactElement {
  return (
    <HudShell>
      {children}
      <TypedComposer />
    </HudShell>
  );
}
