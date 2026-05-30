import { HudFooter } from "./HudFooter";
import { HudHeader } from "./HudHeader";

type HudShellProps = {
  children: React.ReactNode;
};

export function HudShell({ children }: HudShellProps): React.ReactElement {
  return (
    <div className="cockpit-hud flex min-h-[calc(100vh-3.5rem)] flex-col">
      <HudHeader />
      <div className="flex-1">{children}</div>
      <HudFooter />
    </div>
  );
}
