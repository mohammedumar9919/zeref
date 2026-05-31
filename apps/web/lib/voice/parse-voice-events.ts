import {
  PipelineEventSchema,
  VoiceAudioEventSchema,
  VoiceStateEventSchema,
  VoiceTranscriptEventSchema,
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
