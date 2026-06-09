import type { CockpitSlicesV8 } from "@zeref/contracts";

/** Empty cockpit slices for build-time / offline fallback. */
export const EMPTY_COCKPIT_SLICES: CockpitSlicesV8 = {
  schemaVersion: "phase8-cockpit-v1",
  panels: {
    studio: { items: [], insufficientData: false },
    calendar: { items: [], insufficientData: false },
    reports: { items: [], insufficientData: false },
    research: { items: [], insufficientData: true },
  },
};
