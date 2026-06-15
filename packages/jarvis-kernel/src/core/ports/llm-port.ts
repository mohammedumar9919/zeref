import type { ToolDescriptor } from "../tool-descriptor.js";

export type LlmRole = "system" | "user" | "assistant" | "tool";

export type LlmMessage = {
  role: LlmRole;
  content: string;
  toolCallId?: string;
};

export type LlmPredictInput = {
  messages: LlmMessage[];
  tools: ToolDescriptor[];
};

export type LlmPredictResult = {
  text?: string;
  toolCall?: {
    name: string;
    args: Record<string, unknown>;
    id?: string;
  };
  tokensUsed?: number;
};

/** LLM adapter port (C144) — no provider coupling in core. */
export type LlmPort = {
  predict(input: LlmPredictInput): Promise<LlmPredictResult>;
};
