import { z } from "zod";
import { JarvisToolNameSchema } from "../phase6/jarvis-turn.js";

/** Tool capability tier (ADR-040 C146). */
export const JarvisRiskTierSchema = z.enum(["read", "write-low", "write-high"]);
export type JarvisRiskTier = z.infer<typeof JarvisRiskTierSchema>;

/** Agent run lifecycle (ADR-040). */
export const AgentRunStatusSchema = z.enum([
  "running",
  "awaiting_confirm",
  "completed",
  "budget_exhausted",
  "killed",
]);
export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;

/** Persisted agent run summary (C150, C152). */
export const AgentRunSchema = z
  .object({
    id: z.string().uuid(),
    status: AgentRunStatusSchema,
    startedAt: z.string().datetime({ offset: true }),
    endedAt: z.string().datetime({ offset: true }).nullable(),
    turnId: z.string().uuid(),
    transcriptSummary: z.string(),
    iterationCount: z.number().int().nonnegative(),
  })
  .strict();
export type AgentRun = z.infer<typeof AgentRunSchema>;

const agentStepBase = {
  runId: z.string().uuid(),
  stepIndex: z.number().int().nonnegative(),
  ts: z.string().datetime({ offset: true }),
};

/** LLM prediction step (C147). */
export const AgentStepPredictSchema = z
  .object({
    type: z.literal("predict"),
    ...agentStepBase,
    text: z.string().min(1),
  })
  .strict();

/** Tool invocation step (C147). */
export const AgentStepToolCallSchema = z
  .object({
    type: z.literal("tool_call"),
    ...agentStepBase,
    toolName: JarvisToolNameSchema,
    args: z.record(z.unknown()).default({}),
  })
  .strict();

/** Tool observation step (C147). */
export const AgentStepToolResultSchema = z
  .object({
    type: z.literal("tool_result"),
    ...agentStepBase,
    toolName: JarvisToolNameSchema,
    result: z.unknown(),
    durationMs: z.number().nonnegative().optional(),
  })
  .strict();

/** Conversational confirm gate before write-high tools (C155). */
export const AgentStepConfirmPromptSchema = z
  .object({
    type: z.literal("confirm_prompt"),
    ...agentStepBase,
    message: z.string().min(1),
    toolName: JarvisToolNameSchema,
    args: z.record(z.unknown()).default({}),
    riskTier: JarvisRiskTierSchema,
  })
  .strict();

/** Terminal success step (C147). */
export const AgentStepCompletedSchema = z
  .object({
    type: z.literal("completed"),
    ...agentStepBase,
    resultText: z.string().min(1),
  })
  .strict();

/** Terminal budget exhaustion step (C142). */
export const AgentStepBudgetExhaustedSchema = z
  .object({
    type: z.literal("budget_exhausted"),
    ...agentStepBase,
    reason: z.string().min(1),
  })
  .strict();

/** Terminal kill-switch step (C142). */
export const AgentStepKilledSchema = z
  .object({
    type: z.literal("killed"),
    ...agentStepBase,
    reason: z.string().min(1),
  })
  .strict();

/** Stream-shaped agent progress event (C147). */
export const AgentStepSchema = z.discriminatedUnion("type", [
  AgentStepPredictSchema,
  AgentStepToolCallSchema,
  AgentStepToolResultSchema,
  AgentStepConfirmPromptSchema,
  AgentStepCompletedSchema,
  AgentStepBudgetExhaustedSchema,
  AgentStepKilledSchema,
]);
export type AgentStep = z.infer<typeof AgentStepSchema>;

/** Pending write confirmation (C155). */
export const ConfirmRequestSchema = z
  .object({
    runId: z.string().uuid(),
    stepIndex: z.number().int().nonnegative(),
    toolName: JarvisToolNameSchema,
    args: z.record(z.unknown()).default({}),
    message: z.string().min(1),
    riskTier: JarvisRiskTierSchema,
  })
  .strict();
export type ConfirmRequest = z.infer<typeof ConfirmRequestSchema>;
