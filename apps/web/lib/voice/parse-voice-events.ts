import {
  AgentStepSchema,
  PipelineEventSchema,
  VoiceAudioEventSchema,
  VoiceStateEventSchema,
  VoiceTranscriptEventSchema,
  type AgentStep,
  type PipelineEvent,
  type VoiceAudioEvent,
  type VoiceStateEvent,
  type VoiceTranscriptEvent,
} from "@zeref/contracts";

export type VoiceGlobeState = VoiceStateEvent["state"];

export function parseVoiceStateEvent(data: unknown): VoiceStateEvent {
  return VoiceStateEventSchema.parse(data);
}

export function parseVoiceTranscriptEvent(data: unknown): VoiceTranscriptEvent {
  return VoiceTranscriptEventSchema.parse(data);
}

export function parseVoiceAudioEvent(data: unknown): VoiceAudioEvent {
  return VoiceAudioEventSchema.parse(data);
}

export function parsePipelineEvent(data: unknown): PipelineEvent {
  return PipelineEventSchema.parse(data);
}

export function parseAgentStepEvent(data: unknown): AgentStep {
  return AgentStepSchema.parse(data);
}

export function agentStepHudLabel(step: AgentStep): string {
  switch (step.type) {
    case "predict":
      return "THINK";
    case "tool_call":
      return `TOOL ${step.toolName}`;
    case "tool_result":
      return `OBS ${step.toolName}`;
    case "confirm_prompt":
      return "CONFIRM";
    case "completed":
      return "DONE";
    case "budget_exhausted":
      return "BUDGET";
    case "killed":
      return "KILLED";
    default:
      return "STEP";
  }
}
