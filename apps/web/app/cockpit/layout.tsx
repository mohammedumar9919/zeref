import type { ReactNode } from "react";

/** Cockpit reads live BFF data — never prerender with blocking fetch (C27). */
export const dynamic = "force-dynamic";

export default function CockpitLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
