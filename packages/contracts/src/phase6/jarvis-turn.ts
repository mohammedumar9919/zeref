import { z } from "zod";
import {
  VoiceStateEventSchema,
  VoiceTranscriptEventSchema,
} from "./voice-events.js";

export const JarvisToolNameSchema = z.enum([
  "get_cockpit_summary",
  "get_latest_report_headline",
  "get_pipeline_status",
]);

export const JarvisToolCallSchema = z
  .object({
    name: JarvisToolNameSchema,
    args: z.record(z.unknown()).default({}),
    result: z.unknown(),
    durationMs: z.number().nonnegative().optional(),
  })
  .strict();

export const JarvisGlobeStateSchema = z.enum([
  "idle",
  "listening",
  "thinking",
  "speaking",
]);

/** Kernel turn input after STT (ADR-021). */
export const JarvisTurnInputSchema = z
  .object({
    turnId: z.string().uuid(),
    transcript: z.string().min(1),
    ts: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

/** Phase A output — fast ack path; must not await tools/LLM. */
export const JarvisTurnAckOutputSchema = z
  .object({
    ackText: z.string().min(1).max(120),
    globeState: JarvisGlobeStateSchema,
    events: z.array(
      z.union([VoiceTranscriptEventSchema, VoiceStateEventSchema]),
    ),
  })
  .strict();

/** Phase B output — after read-only tools + optional LLM. */
export const JarvisTurnResultOutputSchema = z
  .object({
    resultText: z.string().min(1),
    toolCalls: z.array(JarvisToolCallSchema),
    globeState: JarvisGlobeStateSchema,
    events: z.array(
      z.union([VoiceTranscriptEventSchema, VoiceStateEventSchema]),
    ),
  })
  .strict();

/** Full turn output when BFF awaits both phases (CI sync mock path). */
export const JarvisTurnOutputSchema = z
  .object({
    ackText: z.string().min(1).max(120),
    resultText: z.string().min(1),
    toolCalls: z.array(JarvisToolCallSchema),
    globeState: JarvisGlobeStateSchema,
    events: z.array(
      z.union([VoiceTranscriptEventSchema, VoiceStateEventSchema]),
    ),
  })
  .strict();

export type JarvisToolName = z.infer<typeof JarvisToolNameSchema>;
export type JarvisToolCall = z.infer<typeof JarvisToolCallSchema>;
export type JarvisGlobeState = z.infer<typeof JarvisGlobeStateSchema>;
export type JarvisTurnInput = z.infer<typeof JarvisTurnInputSchema>;
export type JarvisTurnAckOutput = z.infer<typeof JarvisTurnAckOutputSchema>;
export type JarvisTurnResultOutput = z.infer<typeof JarvisTurnResultOutputSchema>;
export type JarvisTurnOutput = z.infer<typeof JarvisTurnOutputSchema>;
