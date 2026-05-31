import type {
  JarvisToolCall,
  JarvisTurnAckOutput,
  JarvisTurnInput,
  JarvisTurnResultOutput,
  VoiceStateEvent,
  VoiceTranscriptEvent,
} from "@zeref/contracts";
import { buildAckText, validateTurnInput } from "./ack.js";
import { defaultLlmAdapter } from "./llm/generate-response.js";
import {
  createDefaultToolRegistry,
  selectToolsForTranscript,
} from "./tools/registry.js";
import { defaultTtsAdapter } from "./tts/synthesize-speech.js";
import type { JarvisKernelDeps, ProcessTurnHandle } from "./types.js";

function defaultNow(): string {
  return new Date().toISOString();
}

export function createDefaultDeps(
  overrides: Partial<JarvisKernelDeps> = {},
): JarvisKernelDeps {
  return {
    tools: overrides.tools ?? createDefaultToolRegistry(),
    toolContext: {
      workerAvailable: process.env.ZEREF_WORKER_AVAILABLE === "1",
      ...overrides.toolContext,
    },
    llm: overrides.llm ?? defaultLlmAdapter,
    tts: overrides.tts ?? defaultTtsAdapter,
    now: overrides.now ?? defaultNow,
    slowPathDelayMs: overrides.slowPathDelayMs ?? 0,
  };
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

export function processTurn(
  input: JarvisTurnInput,
  deps: JarvisKernelDeps = createDefaultDeps(),
): ProcessTurnHandle {
  const validated = validateTurnInput(input);
  const now = deps.now ?? defaultNow;
  const ackText = buildAckText(validated.transcript);
  const ackTs = now();

  const ack: JarvisTurnAckOutput = {
    ackText,
    globeState: "thinking",
    events: [
      transcriptEvent(validated.turnId, "ack", ackText, ackTs),
      stateEvent(validated.turnId, "thinking", ackTs),
    ],
  };

  const complete = runSlowPath(validated, deps);
  return { ack, complete };
}

async function runSlowPath(
  input: JarvisTurnInput,
  deps: JarvisKernelDeps,
): Promise<JarvisTurnResultOutput> {
  if (deps.slowPathDelayMs && deps.slowPathDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, deps.slowPathDelayMs));
  }

  const now = deps.now ?? defaultNow;
  const toolCalls: JarvisToolCall[] = [];
  const selected = selectToolsForTranscript(input.transcript);

  for (const selection of selected) {
    const started = Date.now();
    const handler = deps.tools[selection.name];
    const result = await handler(selection.args, deps.toolContext);
    toolCalls.push({
      name: selection.name,
      args: selection.args,
      result,
      durationMs: Date.now() - started,
    });
  }

  const llm = await deps.llm({ transcript: input.transcript, toolCalls });
  const resultTs = now();

  return {
    resultText: llm.text,
    toolCalls,
    globeState: "speaking",
    events: [
      transcriptEvent(input.turnId, "assistant", llm.text, resultTs),
      stateEvent(input.turnId, "speaking", resultTs),
    ],
  };
}

export async function processTurnSync(
  input: JarvisTurnInput,
  deps?: JarvisKernelDeps,
): Promise<{
  ackText: string;
  resultText: string;
  toolCalls: JarvisToolCall[];
  globeState: "speaking";
  events: Array<VoiceTranscriptEvent | VoiceStateEvent>;
}> {
  const handle = processTurn(input, deps);
  const result = await handle.complete;
  return {
    ackText: handle.ack.ackText,
    resultText: result.resultText,
    toolCalls: result.toolCalls,
    globeState: "speaking",
    events: [...handle.ack.events, ...result.events],
  };
}
