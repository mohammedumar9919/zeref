import {
  CockpitSlicesSchema,
  PHASE5_CONTRACT_VERSION,
  type CockpitSlices,
} from "@zeref/contracts";

import { EMPTY_COCKPIT_SLICES } from "./cockpit-slices-empty";

/** Thrown when cockpit BFF fetch or parse fails (ZR-004 — no silent empty). */
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
 * Validates against CockpitSlicesSchema; throws CockpitBffError on failure.
 */
export async function getCockpitSlices(): Promise<CockpitSlices> {
  const url = `${bffBaseUrl()}/api/v1/cockpit/slices`;

  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate: 30, tags: ["cockpit-slices"] },
    });
  } catch {
    throw new CockpitBffError("Cockpit BFF unavailable — is the web server running?");
  }

  if (!res.ok) {
    throw new CockpitBffError(`Cockpit BFF failed: HTTP ${res.status}`, res.status);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new CockpitBffError("Cockpit BFF returned invalid JSON");
  }

  try {
    return CockpitSlicesSchema.parse(json);
  } catch {
    throw new CockpitBffError("Cockpit BFF response failed schema validation");
  }
}

export function getWebPhaseMarker(): string {
  return `web@${PHASE5_CONTRACT_VERSION}`;
}
