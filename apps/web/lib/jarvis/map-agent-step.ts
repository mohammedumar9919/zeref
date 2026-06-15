import type {
  AgentStep as ContractAgentStep,
  JarvisToolName,
} from "@zeref/contracts";
import type { AgentStep as CoreAgentStep } from "@zeref/jarvis-kernel";
import { getZerefToolDescriptor } from "@zeref/jarvis-kernel";

/** Map portable core steps to contract AgentStep union (C147). */
export function mapCoreStepToContract(
  runId: string,
  step: CoreAgentStep,
  ts: string,
  toolCallArgs?: Record<string, unknown>,
): ContractAgentStep[] {
  switch (step.type) {
    case "llm_predict": {
      const mapped: ContractAgentStep[] = [];
      if (step.text) {
        mapped.push({
          type: "predict",
          runId,
          stepIndex: step.stepIndex,
          ts,
          text: step.text,
        });
      }
      if (step.toolCall) {
        mapped.push({
          type: "tool_call",
          runId,
          stepIndex: step.stepIndex,
          ts,
          toolName: step.toolCall.name as JarvisToolName,
          args: step.toolCall.args,
        });
      }
      return mapped;
    }
    case "tool_execute":
      return [
        {
          type: "tool_result",
          runId,
          stepIndex: step.stepIndex,
          ts,
          toolName: step.toolName as JarvisToolName,
          result: step.ok ? step.result : { error: step.error },
        },
      ];
    case "confirm_required": {
      const descriptor = getZerefToolDescriptor(step.toolName);
      return [
        {
          type: "confirm_prompt",
          runId,
          stepIndex: step.stepIndex,
          ts,
          message: step.message,
          toolName: step.toolName as JarvisToolName,
          args: toolCallArgs ?? {},
          riskTier: descriptor?.riskTier ?? "write-high",
        },
      ];
    }
    case "terminal": {
      if (step.reason === "completed" && step.text) {
        return [
          {
            type: "completed",
            runId,
            stepIndex: step.stepIndex,
            ts,
            resultText: step.text,
          },
        ];
      }
      if (step.reason === "budget_exhausted") {
        return [
          {
            type: "budget_exhausted",
            runId,
            stepIndex: step.stepIndex,
            ts,
            reason: step.text ?? "agent budget exhausted",
          },
        ];
      }
      if (step.reason === "killed") {
        return [
          {
            type: "killed",
            runId,
            stepIndex: step.stepIndex,
            ts,
            reason: step.text ?? "agent run killed",
          },
        ];
      }
      return [];
    }
    default:
      return [];
  }
}
