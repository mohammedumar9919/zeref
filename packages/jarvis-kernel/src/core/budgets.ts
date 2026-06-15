/** Agent run budget limits (C142). Align with @zeref/contracts/phase11 in P11-B. */
export type AgentBudgets = {
  maxIterations: number;
  wallClockMs: number;
  tokenBudget: number;
};

export type BudgetState = {
  iteration: number;
  elapsedMs: number;
  tokensUsed: number;
};

/** Defaults per ADR-040 — mock CI uses tight limits. */
export const DEFAULT_AGENT_BUDGETS: AgentBudgets = {
  maxIterations: 8,
  wallClockMs: 30_000,
  tokenBudget: 100_000,
};

export function mergeBudgets(
  partial?: Partial<AgentBudgets>,
): AgentBudgets {
  return { ...DEFAULT_AGENT_BUDGETS, ...partial };
}

export function isBudgetExhausted(
  state: BudgetState,
  budgets: AgentBudgets,
): boolean {
  if (state.iteration >= budgets.maxIterations) return true;
  if (state.elapsedMs >= budgets.wallClockMs) return true;
  if (state.tokensUsed >= budgets.tokenBudget) return true;
  return false;
}

export function budgetExhaustionReason(
  state: BudgetState,
  budgets: AgentBudgets,
): "max_iterations" | "wall_clock" | "token_budget" | null {
  if (state.iteration >= budgets.maxIterations) return "max_iterations";
  if (state.elapsedMs >= budgets.wallClockMs) return "wall_clock";
  if (state.tokensUsed >= budgets.tokenBudget) return "token_budget";
  return null;
}
