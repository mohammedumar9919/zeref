/** Risk tier capability model (C146). Not auth — single-operator gates only. */
export type RiskTier = "read" | "write-low" | "write-high";

export function confirmRequired(riskTier: RiskTier): boolean {
  return riskTier === "write-high";
}

export function canExecuteTool(
  riskTier: RiskTier,
  confirmed: boolean,
): boolean {
  if (confirmRequired(riskTier)) {
    return confirmed;
  }
  return true;
}

export function isWriteTier(riskTier: RiskTier): boolean {
  return riskTier === "write-low" || riskTier === "write-high";
}
