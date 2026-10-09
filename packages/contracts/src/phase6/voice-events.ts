import { z } from "zod";

export const VoiceTranscriptRoleSchema = z.enum(["user", "ack", "assistant"]);

export const VoiceAudioPhaseSchema = z.enum(["ack", "result"]);

/** SSE voice.state (ADR-024). */
export const VoiceStateEventSchema = z
  .object({
    type: z.literal("voice.state"),
    turnId: z.string().uuid().optional(),
    state: z.enum(["idle", "listening", "thinking", "speaking"]),
    ts: z.string().datetime({ offset: true }),
    simulated: z.boolean().optional(),
  })
  .strict();

/** SSE voice.transcript (ADR-024). */
export const VoiceTranscriptEventSchema = z
  .object({
    type: z.literal("voice.transcript"),
    turnId: z.string().uuid(),
    role: VoiceTranscriptRoleSchema,
    text: z.string().min(1),
    ts: z.string().datetime({ offset: true }),
  })
  .strict();

/** SSE voice.audio — Amendment A two-phase delivery (ADR-024). */
export const VoiceAudioEventSchema = z
  .object({
    type: z.literal("voice.audio"),
    turnId: z.string().uuid(),
    phase: VoiceAudioPhaseSchema,
    audioBase64: z.string().min(1),
    mimeType: z.enum(["audio/mpeg", "audio/wav"]),
    ts: z.string().datetime({ offset: true }),
    /** Result sentence order within a turn (C10); emitted strictly ascending. */
    seq: z.number().int().min(0).optional(),
    /** Server ms from transcription done to this event; only on a turn's first audio (C10). */
    serverFirstAudioMs: z.number().min(0).optional(),
  })
  .strict();

/** Target for PTT release → first reply audio playing (C10 / CLOUD-A4). Not a measurement. */
export const FIRST_AUDIO_TARGET_MS = 1200;

/** Client-measured first-audio sample POSTed to /api/v1/ops/voice-latency (C10). */
export const VoiceLatencySampleSchema = z
  .object({
    turnId: z.string().uuid(),
    firstAudioMs: z.number().finite().min(0),
    source: z.literal("client"),
  })
  .strict();

/** Optional pipeline status on SSE stream (ADR-024). */
export const PipelineEventSchema = z
  .object({
    type: z.literal("pipeline"),
    stage: z.string().min(1),
    message: z.string().min(1),
    ts: z.string().datetime({ offset: true }),
    simulated: z.boolean(),
  })
  .strict();

export type VoiceTranscriptRole = z.infer<typeof VoiceTranscriptRoleSchema>;
export type VoiceAudioPhase = z.infer<typeof VoiceAudioPhaseSchema>;
export type VoiceStateEvent = z.infer<typeof VoiceStateEventSchema>;
export type VoiceTranscriptEvent = z.infer<typeof VoiceTranscriptEventSchema>;
export type VoiceAudioEvent = z.infer<typeof VoiceAudioEventSchema>;
export type PipelineEvent = z.infer<typeof PipelineEventSchema>;
export type VoiceLatencySample = z.infer<typeof VoiceLatencySampleSchema>;
