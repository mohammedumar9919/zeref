import type { ReactNode } from "react";

/** Remounts on every cockpit route change: CSS-only fade + slide-up, no exit animation (C17b). */
export default function CockpitTemplate({ children }: { children: ReactNode }): ReactNode {
  return (
    <div data-testid="route-transition" className="animate-slide-up-in">
      {children}
    </div>
  );
}
