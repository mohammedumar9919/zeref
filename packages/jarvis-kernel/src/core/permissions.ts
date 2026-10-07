/** Risk tier capability model (C146). Not auth — single-operator gates only. */
export type RiskTier = "read" | "write-low" | "write-high";

/** Operator approval for exactly one write-high call (K1). Single use per run. */
export type ConfirmGrant = {
  runId: string;
  toolName: string;
  argsHash: string;
};

export type ToolCallIdentity = ConfirmGrant;

export function confirmRequired(riskTier: RiskTier): boolean {
  return riskTier === "write-high";
}

export function grantMatches(
  grant: unknown,
  call: ToolCallIdentity,
): boolean {
  if (typeof grant !== "object" || grant === null) return false;
  const g = grant as Partial<ConfirmGrant>;
  return (
    typeof g.runId === "string" &&
    typeof g.toolName === "string" &&
    typeof g.argsHash === "string" &&
    g.runId === call.runId &&
    g.toolName === call.toolName &&
    g.argsHash === call.argsHash
  );
}

export function canExecuteTool(
  riskTier: RiskTier,
  grant: ConfirmGrant | undefined,
  call: ToolCallIdentity,
): boolean {
  if (confirmRequired(riskTier)) {
    return grantMatches(grant, call);
  }
  return true;
}

export function isWriteTier(riskTier: RiskTier): boolean {
  return riskTier === "write-low" || riskTier === "write-high";
}
