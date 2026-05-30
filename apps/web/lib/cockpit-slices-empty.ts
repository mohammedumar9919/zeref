import type { CockpitSlices } from "@zeref/contracts";

/** Empty cockpit slices for build-time / offline fallback. */
export const EMPTY_COCKPIT_SLICES: CockpitSlices = {
  schemaVersion: "phase5-cockpit-v1",
  panels: {
    studio: { items: [], insufficientData: false },
    calendar: { items: [], insufficientData: false },
    reports: { items: [], insufficientData: false },
    research: { items: [], insufficientData: true },
  },
};
