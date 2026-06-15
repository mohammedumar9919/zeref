import { randomUUID } from "node:crypto";

import type {
  AgentStep as ContractAgentStep,
  JarvisToolCall,
  JarvisToolName,
  VoiceStateEvent,
  VoiceTranscriptEvent,
} from "@zeref/contracts";
import { AgentStepSchema } from "@zeref/contracts";
import {
  runAgentLoop,
  ZEREF_TOOL_DESCRIPTORS,
  createZerefToolExecutor,
  buildAckText,
  type AgentRunResult,
  type AgentStep as CoreAgentStep,
  type PendingConfirm,
} from "@zeref/jarvis-kernel";

import { getCockpitEventBus } from "../cockpit/cockpit-event-bus";
import { persistAgentAudit } from "./audit-persist";
import { createJarvisLlmPort } from "./llm-port";
import { mapCoreStepToContract } from "./map-agent-step";
import { createZerefContext } from "./zeref-context";

export type JarvisAgentRunInput = {
  turnId: string;
  transcript: string;
  confirmed?: boolean;
  runId?: string;
};

export type JarvisAgentRunOutput = {
  runId: string;
  ackText: string;
  resultText: string;
  toolCalls: JarvisToolCall[];
  globeState: "speaking";
  events: Array<VoiceTranscriptEvent | VoiceStateEvent>;
  terminalReason: AgentRunResult["terminalReason"];
  pendingConfirm?: PendingConfirm;
  contractSteps: ContractAgentStep[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function transcriptEvent(
  turnId: string,
  role: VoiceTranscriptEvent["role"],
  text: string,
  ts: string,
): VoiceTranscriptEvent {
  return { type: "voice.transcript", turnId, role, text, ts };
}

function stateEvent(
  turnId: string,
  state: VoiceStateEvent["state"],
  ts: string,
): VoiceStateEvent {
  return { type: "voice.state", turnId, state, ts };
}

function extractToolCalls(steps: CoreAgentStep[]): JarvisToolCall[] {
  const calls: JarvisToolCall[] = [];
  const pendingArgs = new Map<number, Record<string, unknown>>();

  for (const step of steps) {
    if (step.type === "llm_predict" && step.toolCall) {
      pendingArgs.set(step.stepIndex, step.toolCall.args);
    }
    if (step.type === "tool_execute") {
      const args = pendingArgs.get(step.stepIndex - 1) ?? {};
      calls.push({
        name: step.toolName as JarvisToolName,
        args,
        result: step.ok ? step.result : { error: step.error },
      });
    }
  }

  return calls;
}

function confirmResultText(pending: PendingConfirm): string {
  return `Shall I proceed with ${pending.toolName.replaceAll("_", " ")}?`;
}

function emitAgentSteps(
  runId: string,
  coreStep: CoreAgentStep,
  ts: string,
  toolCallArgs?: Record<string, unknown>,
): void {
  const bus = getCockpitEventBus();
  const mapped = mapCoreStepToContract(runId, coreStep, ts, toolCallArgs);
  for (const step of mapped) {
    const parsed = AgentStepSchema.parse(step);
    bus.emit("agent.step", parsed);
  }
}

/** Phase 11 agent runtime — ReAct loop via BFF ports (C157). */
export async function runJarvisAgent(
  input: JarvisAgentRunInput,
): Promise<JarvisAgentRunOutput> {
  const runId = input.runId ?? randomUUID();
  const startedAt = nowIso();
  const zerefContext = createZerefContext(input.turnId);
  const toolExecutor = createZerefToolExecutor(zerefContext);
  const llm = createJarvisLlmPort();
  const contractSteps: ContractAgentStep[] = [];
  let lastToolCallArgs: Record<string, unknown> | undefined;

  const result = await runAgentLoop({
    runId,
    transcript: input.transcript,
    llm,
    toolExecutor,
    tools: ZEREF_TOOL_DESCRIPTORS,
    confirmed: input.confirmed,
    onStep: (step) => {
      const ts = nowIso();
      if (step.type === "llm_predict" && step.toolCall) {
        lastToolCallArgs = step.toolCall.args;
      }
      const mapped = mapCoreStepToContract(runId, step, ts, lastToolCallArgs);
      contractSteps.push(...mapped);
      emitAgentSteps(runId, step, ts, lastToolCallArgs);
    },
  });

  const endedAt = nowIso();
  const toolCalls = extractToolCalls(result.steps);
  const iterationCount = result.audit.entries.length;

  await persistAgentAudit({
    runId,
    turnId: input.turnId,
    transcript: input.transcript,
    terminalReason: result.terminalReason,
    audit: result.audit,
    iterationCount,
    startedAt,
    endedAt,
  });

  const ackText = buildAckText(input.transcript);
  let resultText: string;
  if (result.terminalReason === "awaiting_confirm" && result.pendingConfirm) {
    resultText = confirmResultText(result.pendingConfirm);
  } else if (result.finalText) {
    resultText = result.finalText;
  } else if (result.terminalReason === "budget_exhausted") {
    resultText = "I'm afraid I've hit my thinking budget for this turn.";
  } else if (result.terminalReason === "killed") {
    resultText = "Run cancelled.";
  } else {
    resultText = "Done.";
  }

  const resultTs = nowIso();
  const events: Array<VoiceTranscriptEvent | VoiceStateEvent> = [
    transcriptEvent(input.turnId, "assistant", resultText, resultTs),
    stateEvent(input.turnId, "speaking", resultTs),
  ];

  return {
    runId,
    ackText,
    resultText,
    toolCalls,
    globeState: "speaking",
    events,
    terminalReason: result.terminalReason,
    pendingConfirm: result.pendingConfirm,
    contractSteps,
  };
}

export function isPhase11AgentEnabled(): boolean {
  return process.env.ZEREF_PHASE11_AGENT === "1";
}
