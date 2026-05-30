import {
  CockpitSlicesSchema,
  PHASE5_CONTRACT_VERSION,
  type CockpitSlices,
} from "@zeref/contracts";

import { loadCockpitSlices } from "./cockpit-bff";
import { EMPTY_COCKPIT_SLICES } from "./cockpit-slices-empty";

/** Thrown when cockpit BFF load or parse fails (ZR-004 — no silent empty). */
export class CockpitBffError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "CockpitBffError";
    this.status = status;
  }
}

/** Empty cockpit slices for build-time static generation only. */
export { EMPTY_COCKPIT_SLICES };

/**
 * RSC server load for cockpit panel summaries (C27).
 * Calls loadCockpitSlices() directly — no HTTP loopback (Phase 5.0.2 / ADR-016).
 */
export async function getCockpitSlices(): Promise<CockpitSlices> {
  try {
    const slices = await loadCockpitSlices();
    return CockpitSlicesSchema.parse(slices);
  } catch (err) {
    if (err instanceof CockpitBffError) {
      throw err;
    }
    const message =
      err instanceof Error ? err.message : "Cockpit BFF failed to load slices";
    throw new CockpitBffError(message);
  }
}

export function getWebPhaseMarker(): string {
  return `web@${PHASE5_CONTRACT_VERSION}`;
}
