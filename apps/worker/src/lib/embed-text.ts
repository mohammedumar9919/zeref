import type { NormalizedPostPayload } from "@zeref/contracts";

/** Text fingerprint for embed stage — from normalized entity only (ADR-008). */
export function embedTextFromNormalized(payload: NormalizedPostPayload): string {
  const parts = [
    payload.shortcode,
    payload.caption ?? "",
    payload.mediaType ?? "",
    payload.sources.join(","),
  ].filter((p) => p.length > 0);
  return parts.join(" | ");
}
