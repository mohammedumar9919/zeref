/** Streaming agent.step event types (C147). Align with @zeref/contracts/phase11 AgentStep in P11-B. */
export type AgentTerminalReason =
  | "completed"
  | "budget_exhausted"
  | "killed"
  | "awaiting_confirm";

export type AgentToolCallRef = {
  name: string;
  args: Record<string, unknown>;
  id?: string;
};

export type LlmPredictStep = {
  type: "llm_predict";
  stepIndex: number;
  text?: string;
  toolCall?: AgentToolCallRef;
  tokensUsed?: number;
};

export type ToolExecuteStep = {
  type: "tool_execute";
  stepIndex: number;
  toolName: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

export type ConfirmRequiredStep = {
  type: "confirm_required";
  stepIndex: number;
  toolName: string;
  message: string;
};

export type TerminalStep = {
  type: "terminal";
  stepIndex: number;
  reason: AgentTerminalReason;
  text?: string;
};

export type AgentStep =
  | LlmPredictStep
  | ToolExecuteStep
  | ConfirmRequiredStep
  | TerminalStep;
