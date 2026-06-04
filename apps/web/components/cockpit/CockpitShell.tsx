import type { CockpitSlicesV8 } from "@zeref/contracts";

import { VoiceHudShell } from "@/components/hud/VoiceHudShell";

import { CockpitGrid, type CockpitFocus } from "./CockpitGrid";

type CockpitShellProps = {
  slices: CockpitSlicesV8;
  focus?: CockpitFocus;
  pageTestId?: string;
};

export function CockpitShell({
  slices,
  focus = null,
  pageTestId = "cockpit-page",
}: CockpitShellProps): React.ReactElement {
  return (
    <div data-testid={pageTestId}>
      <VoiceHudShell>
        <CockpitGrid slices={slices} focus={focus} />
      </VoiceHudShell>
    </div>
  );
}
