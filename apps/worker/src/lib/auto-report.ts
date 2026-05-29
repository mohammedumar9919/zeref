/** Auto-chain policy (ADR-012): after successful analyze, run report unless disabled. */
export function isAutoReportEnabled(): boolean {
  return process.env.ZEREF_AUTO_REPORT !== "0";
}
