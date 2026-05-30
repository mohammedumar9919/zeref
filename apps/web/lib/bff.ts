import {
  CockpitSlicesSchema,
  PHASE5_CONTRACT_VERSION,
  type CockpitSlices,
} from "@zeref/contracts";

import { EMPTY_COCKPIT_SLICES } from "./cockpit-slices-empty";

/** Empty cockpit slices for build-time / offline fallback. */
export { EMPTY_COCKPIT_SLICES };

function bffBaseUrl(): string {
  const explicit = process.env.ZEREF_BFF_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

/**
 * RSC server fetch for cockpit panel summaries (C27).
 * Validates against CockpitSlicesSchema; falls back when BFF is unavailable.
 */
export async function getCockpitSlices(): Promise<CockpitSlices> {
  const url = `${bffBaseUrl()}/api/v1/cockpit/slices`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 30, tags: ["cockpit-slices"] },
    });

    if (!res.ok) {
      return EMPTY_COCKPIT_SLICES;
    }

    const json: unknown = await res.json();
    return CockpitSlicesSchema.parse(json);
  } catch {
    return EMPTY_COCKPIT_SLICES;
  }
}

export function getWebPhaseMarker(): string {
  return `web@${PHASE5_CONTRACT_VERSION}`;
}
