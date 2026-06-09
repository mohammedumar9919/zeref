import {
  CockpitSlicesSchemaV8,
  CockpitSlicesSchemaV9,
  PHASE8_CONTRACT_VERSION,
  type CockpitSlicesV8,
  type CockpitSlicesV9,
} from "@zeref/contracts";

import { isPhase9ResearchActive, loadCockpitSlices } from "./cockpit-bff";
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
export async function getCockpitSlices(): Promise<CockpitSlicesV8 | CockpitSlicesV9> {
  try {
    const slices = await loadCockpitSlices();
    if (isPhase9ResearchActive()) {
      return CockpitSlicesSchemaV9.parse(slices);
    }
    return CockpitSlicesSchemaV8.parse(slices);
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
  return `web@${PHASE8_CONTRACT_VERSION}`;
}
