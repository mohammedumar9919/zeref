/**
 * Auto-chain policy (ADR-008): after successful normalize, run embed inline unless disabled.
 * Default enabled in dev; set `ZEREF_AUTO_EMBED=0` to enqueue embed separately.
 */
export function isAutoEmbedEnabled(): boolean {
  return process.env.ZEREF_AUTO_EMBED !== "0";
}
