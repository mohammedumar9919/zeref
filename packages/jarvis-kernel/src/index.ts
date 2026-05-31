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
} from "./tools/registry.js";

export { buildAckText } from "./ack.js";

export type {
  JarvisKernelDeps,
  ProcessTurnHandle,
  ToolContext,
  JarvisToolRegistry,
  LlmAdapter,
  TtsAdapter,
  SpeechSynthesisResult,
  SpeechSynthesisOptions,
} from "./types.js";

export type { JarvisTurnInput } from "@zeref/contracts";
