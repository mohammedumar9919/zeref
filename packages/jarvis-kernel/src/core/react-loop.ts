import type { AgentStep, AgentTerminalReason } from "./agent-step.js";
import {
  createAuditBuffer,
  hashArgs,
  summarizeAuditResult,
  type AuditBuffer,
} from "./audit.js";
import {
  budgetExhaustionReason,
  isBudgetExhausted,
  mergeBudgets,
  type AgentBudgets,
} from "./budgets.js";
import { britishPartnerSystemPrompt, detectPersonaMode } from "./persona.js";
import { canExecuteTool } from "./permissions.js";
import type { LlmMessage, LlmPort } from "./ports/llm-port.js";
import type { MemoryPort } from "./ports/memory-port.js";
import type { ToolExecutorPort } from "./ports/tool-executor-port.js";
import type { ToolDescriptor } from "./tool-descriptor.js";

export type AgentRunInput = {
  runId: string;
  transcript: string;
  llm: LlmPort;
  toolExecutor: ToolExecutorPort;
  tools: ToolDescriptor[];
  memory?: MemoryPort;
  budgets?: Partial<AgentBudgets>;
  /** Resume flag after conversational confirm (C155). */
  confirmed?: boolean;
  killSignal?: AbortSignal;
  onStep?: (step: AgentStep) => void;
  now?: () => string;
};

export type PendingConfirm = {
  toolName: string;
  args: Record<string, unknown>;
};

export type AgentRunResult = {
  terminalReason: AgentTerminalReason;
  steps: AgentStep[];
  audit: AuditBuffer;
  finalText?: string;
  pendingConfirm?: PendingConfirm;
};

/**
 * Portable ReAct loop (C141): predict → act → observe → repeat until finish,
 * budget exhausted, killed, or awaiting confirm.
 */
export async function runAgentLoop(
  input: AgentRunInput,
): Promise<AgentRunResult> {
  const budgets = mergeBudgets(input.budgets);
  const audit = createAuditBuffer();
  const steps: AgentStep[] = [];
  const startMs = Date.now();
  let stepIndex = 0;
  let iteration = 0;
  let tokensUsed = 0;
  let confirmed = input.confirmed ?? false;

  const emit = (step: AgentStep) => {
    steps.push(step);
    input.onStep?.(step);
  };

  const finish = (
    reason: AgentTerminalReason,
    text?: string,
    pendingConfirm?: PendingConfirm,
  ): AgentRunResult => ({
    terminalReason: reason,
    steps,
    audit,
    finalText: text,
    pendingConfirm,
  });

  const mode = detectPersonaMode(input.transcript);
  const messages: LlmMessage[] = [
    { role: "system", content: britishPartnerSystemPrompt(mode) },
    { role: "user", content: input.transcript },
  ];

  const budgetState = () => ({
    iteration,
    elapsedMs: Date.now() - startMs,
    tokensUsed,
  });

  while (true) {
    if (input.killSignal?.aborted) {
      emit({ type: "terminal", stepIndex: stepIndex++, reason: "killed" });
      return finish("killed");
    }

    const state = budgetState();
    if (isBudgetExhausted(state, budgets)) {
      const detail = budgetExhaustionReason(state, budgets);
      emit({
        type: "terminal",
        stepIndex: stepIndex++,
        reason: "budget_exhausted",
        text: detail ?? undefined,
      });
      return finish("budget_exhausted");
    }

    const predict = await input.llm.predict({
      messages,
      tools: input.tools,
    });
    tokensUsed += predict.tokensUsed ?? 0;

    emit({
      type: "llm_predict",
      stepIndex: stepIndex++,
      text: predict.text,
      toolCall: predict.toolCall,
      tokensUsed: predict.tokensUsed,
    });

    if (predict.toolCall) {
      const { name, args, id } = predict.toolCall;
      const descriptor = input.tools.find((t) => t.name === name);
      const riskTier = descriptor?.riskTier ?? "read";

      if (!canExecuteTool(riskTier, confirmed)) {
        const message = `Shall I proceed with ${name}?`;
        emit({
          type: "confirm_required",
          stepIndex: stepIndex++,
          toolName: name,
          message,
        });
        emit({
          type: "terminal",
          stepIndex: stepIndex++,
          reason: "awaiting_confirm",
        });
        return finish("awaiting_confirm", undefined, { toolName: name, args });
      }

      const result = await input.toolExecutor.execute(name, args);
      const ts = input.now?.() ?? new Date().toISOString();

      audit.append({
        runId: input.runId,
        stepIndex: stepIndex - 1,
        toolName: name,
        argsHash: hashArgs(args),
        riskTier,
        resultSummary: summarizeAuditResult(result.data, result.error),
        ts,
        simulated: Boolean(result.auditMeta?.simulated),
      });

      emit({
        type: "tool_execute",
        stepIndex: stepIndex++,
        toolName: name,
        ok: result.ok,
        result: result.data,
        error: result.error,
      });

      messages.push({
        role: "assistant",
        content: JSON.stringify({ toolCall: { name, args, id } }),
      });
      messages.push({
        role: "tool",
        content: JSON.stringify(result),
        toolCallId: id,
      });

      iteration += 1;
      continue;
    }

    if (predict.text) {
      emit({
        type: "terminal",
        stepIndex: stepIndex++,
        reason: "completed",
        text: predict.text,
      });
      return finish("completed", predict.text);
    }

    iteration += 1;
  }
}
