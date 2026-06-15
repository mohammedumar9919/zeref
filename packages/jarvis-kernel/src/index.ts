export {
  PHASE6_CONTRACT_VERSION,
  JarvisTurnInputSchema,
  JarvisTurnAckOutputSchema,
  JarvisTurnResultOutputSchema,
  JarvisTurnOutputSchema,
  VoiceAudioEventSchema,
} from "@zeref/contracts";

export {
  processTurn,
  processTurnSync,
  createDefaultDeps,
} from "./process-turn.js";

export {
  defaultTtsAdapter,
  synthesizeWithMock,
  synthesizeWithElevenLabs,
  synthesizeWithOpenAi,
} from "./tts/synthesize-speech.js";

export { defaultLlmAdapter } from "./llm/generate-response.js";

export {
  createDefaultToolRegistry,
  selectToolsForTranscript,
  getCockpitSummary,
  getLatestReportHeadline,
  getPipelineStatus,
  memorySave,
  memorySearch,
} from "./tools/registry.js";

export { buildAckText } from "./ack.js";

export type {
  JarvisKernelDeps,
  ProcessTurnHandle,
  ToolContext,
  JarvisToolRegistry,
  JarvisKernelToolCall,
  JarvisKernelToolName,
  LlmAdapter,
  TtsAdapter,
  SpeechSynthesisResult,
  SpeechSynthesisOptions,
} from "./types.js";

export type { JarvisTurnInput } from "@zeref/contracts";

export {
  runAgentLoop,
  type AgentRunInput,
  type AgentRunResult,
  type PendingConfirm,
  type AgentStep,
  type AuditBuffer,
  type LlmPort,
  type LlmPredictInput,
  type LlmPredictResult,
  type MemoryPort,
  type ToolDescriptor,
} from "./core/index.js";

export * from "./zeref/index.js";
