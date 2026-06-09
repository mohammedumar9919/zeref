import type { JarvisTurnInput } from "@zeref/contracts";

export type JarvisKernelToolName =
  | "get_cockpit_summary"
  | "get_latest_report_headline"
  | "get_pipeline_status"
  | "memory_save"
  | "memory_search";

export type JarvisKernelToolCall = {
  name: JarvisKernelToolName;
  args: Record<string, unknown>;
  result: unknown;
  durationMs?: number;
};

export type ToolContext = {
  cockpitFixturePath?: string;
  reportFixturePath?: string;
  workerAvailable?: boolean;
  turnId?: string;
  transcript?: string;
};

export type JarvisToolHandler = (
  args: Record<string, unknown>,
  ctx: ToolContext,
) => Promise<unknown>;

export type JarvisToolRegistry = Record<JarvisKernelToolName, JarvisToolHandler>;

export type LlmGenerateInput = {
  transcript: string;
  toolCalls: JarvisKernelToolCall[];
};

export type LlmGenerateResult = {
  text: string;
  model: string;
  mocked: boolean;
};

export type LlmAdapter = (input: LlmGenerateInput) => Promise<LlmGenerateResult>;

export type SpeechSynthesisOptions = {
  phase?: "ack" | "result";
};

export type SpeechSynthesisResult = {
  audio: Buffer;
  mimeType: "audio/mpeg" | "audio/wav";
  provider: "elevenlabs" | "openai" | "mock";
  mocked: boolean;
  durationMs: number;
};

export type TtsAdapter = (
  text: string,
  opts?: SpeechSynthesisOptions,
) => Promise<SpeechSynthesisResult>;

export type JarvisKernelDeps = {
  tools: JarvisToolRegistry;
  toolContext: ToolContext;
  llm: LlmAdapter;
  tts: TtsAdapter;
  now?: () => string;
  slowPathDelayMs?: number;
};

export type ProcessTurnHandle = {
  ack: import("@zeref/contracts").JarvisTurnAckOutput;
  complete: Promise<import("@zeref/contracts").JarvisTurnResultOutput>;
};

export type { JarvisTurnInput };
