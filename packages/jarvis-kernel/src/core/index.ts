export {
  runAgentLoop,
  type AgentRunInput,
  type AgentRunResult,
  type PendingConfirm,
} from "./react-loop.js";

export {
  DEFAULT_AGENT_BUDGETS,
  mergeBudgets,
  isBudgetExhausted,
  budgetExhaustionReason,
  type AgentBudgets,
  type BudgetState,
} from "./budgets.js";

export {
  confirmRequired,
  canExecuteTool,
  isWriteTier,
  type RiskTier,
} from "./permissions.js";

export {
  ToolInputSchema,
  parseToolArgs,
  type ToolDescriptor,
  type CostHint,
} from "./tool-descriptor.js";

export {
  detectPersonaMode,
  britishPartnerSystemPrompt,
  type PersonaMode,
} from "./persona.js";

export {
  createAuditBuffer,
  hashArgs,
  summarizeAuditResult,
  type JarvisAuditEntry,
  type AuditBuffer,
} from "./audit.js";

export type {
  AgentStep,
  AgentTerminalReason,
  AgentToolCallRef,
  LlmPredictStep,
  ToolExecuteStep,
  ConfirmRequiredStep,
  TerminalStep,
} from "./agent-step.js";

export type {
  LlmPort,
  LlmMessage,
  LlmPredictInput,
  LlmPredictResult,
  LlmRole,
} from "./ports/llm-port.js";

export type { MemoryPort, MemorySearchResult } from "./ports/memory-port.js";

export type {
  ToolExecutorPort,
  ToolExecutionResult,
} from "./ports/tool-executor-port.js";
