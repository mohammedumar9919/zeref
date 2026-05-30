import type { CockpitSlices } from "@zeref/contracts";

import { HudShell } from "@/components/hud/HudShell";

import { CockpitGrid, type CockpitFocus } from "./CockpitGrid";

type CockpitShellProps = {
  slices: CockpitSlices;
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
      <HudShell>
        <CockpitGrid slices={slices} focus={focus} />
      </HudShell>
    </div>
  );
}
