import type { CockpitSlicesV8, CockpitSlicesV9 } from "@zeref/contracts";

import { VoiceHudShell } from "@/components/hud/VoiceHudShell";

import { CockpitGrid, type CockpitFocus } from "./CockpitGrid";

type CockpitShellProps = {
  slices: CockpitSlicesV8 | CockpitSlicesV9;
  focus?: CockpitFocus;
  pageTestId?: string;
};

export function CockpitShell({
  slices,
  focus = null,
  pageTestId = "cockpit-page",
}: CockpitShellProps): React.ReactElement {
  const workspaceClass = focus ? "cockpit-workspace" : undefined;

  return (
    <div data-testid={pageTestId} className={workspaceClass}>
      <VoiceHudShell>
        <CockpitGrid slices={slices} focus={focus} />
      </VoiceHudShell>
    </div>
  );
}
