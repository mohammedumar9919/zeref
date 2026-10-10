import { randomUUID } from "node:crypto";

import type {
  VoiceAudioEvent,
  VoiceStateEvent,
  VoiceTranscriptEvent,
} from "@zeref/contracts";
import {
  buildAckText,
  createDefaultDeps,
  defaultTtsAdapter,
  processTurn,
  processTurnSync,
  splitIntoSentences,
  type ProcessTurnHandle,
} from "@zeref/jarvis-kernel";

import {
  isPhase11AgentEnabled,
  runJarvisAgent,
  type JarvisAgentRunOutput,
} from "../jarvis/agent-runtime";
import { isBargeInRequest } from "./barge-in";
import { isCiVoiceMockMode } from "./mock-flags";
import { transcribeAudio } from "./whisper-client";
import type {
  VoiceTurnAcceptedResponse,
  VoiceTurnAudioBlob,
  VoiceTurnSyncResponse,
} from "./types";
import {
  emitMemoryBrainEventsFromToolCalls,
  emitPhase7BrainMemoryFallbackIfNeeded,
} from "../memory/emit-brain-events";
import { getCockpitEventBus } from "../cockpit/cockpit-event-bus";

const pendingTurns = new Set<Promise<void>>();

type PendingVoiceConfirm = {
  runId: string;
  turnId: string;
  transcript: string;
};

let pendingVoiceConfirm: PendingVoiceConfirm | null = null;
let activeVoiceAbort: AbortController | null = null;

/** Abort the in-flight live agent / TTS cascade (barge-in). */
export function abortActiveVoiceTurn(): boolean {
  if (!activeVoiceAbort || activeVoiceAbort.signal.aborted) {
    activeVoiceAbort = null;
    return false;
  }
  activeVoiceAbort.abort();
  activeVoiceAbort = null;
  return true;
}

function beginLiveTurnAbort(): AbortSignal {
  abortActiveVoiceTurn();
  const controller = new AbortController();
  activeVoiceAbort = controller;
  return controller.signal;
}

function nowIso(): string {
  return new Date().toISOString();
}

function emitVoiceEvent(
  event: VoiceTranscriptEvent | VoiceStateEvent | VoiceAudioEvent,
): void {
  getCockpitEventBus().emit(event.type, event);
}

function emitUserTranscript(turnId: string, transcript: string): void {
  emitVoiceEvent({
    type: "voice.transcript",
    turnId,
    role: "user",
    text: transcript,
    ts: nowIso(),
  });
}

function emitKernelEvents(
  events: Array<VoiceTranscriptEvent | VoiceStateEvent>,
): void {
  for (const event of events) {
    emitVoiceEvent(event);
  }
}

function emitFastAck(turnId: string, ackText: string): void {
  const ackTs = nowIso();
  emitVoiceEvent({
    type: "voice.transcript",
    turnId,
    role: "ack",
    text: ackText,
    ts: ackTs,
  });
  emitVoiceEvent({
    type: "voice.state",
    turnId,
    state: "thinking",
    ts: ackTs,
  });
}

/** Per-turn server clock: started when transcription finishes (C10). */
export type TurnAudioClock = {
  startedAt: number;
  firstAudioSent: boolean;
  now: () => number;
};

export function startTurnAudioClock(now: () => number = () => performance.now()): TurnAudioClock {
  return { startedAt: now(), firstAudioSent: false, now };
}

/** Attach serverFirstAudioMs to the first audio event of a turn only. */
function stampFirstAudio(clock: TurnAudioClock | undefined, event: VoiceAudioEvent): VoiceAudioEvent {
  if (!clock || clock.firstAudioSent) return event;
  clock.firstAudioSent = true;
  return {
    ...event,
    serverFirstAudioMs: Math.max(0, Math.round(clock.now() - clock.startedAt)),
  };
}

export type SentenceAudio = {
  audioBase64: string;
  mimeType: VoiceAudioEvent["mimeType"];
};

export type SentenceAudioPipelineOptions = {
  turnId: string;
  killSignal: AbortSignal;
  synthesize: (sentence: string) => Promise<SentenceAudio | null>;
  emit: (event: VoiceAudioEvent) => void;
  clock?: TurnAudioClock;
  maxInFlight?: number;
};

export type SentenceAudioPipeline = {
  /** Start TTS for the sentence now; its audio is emitted only after all earlier sentences. */
  enqueue: (sentence: string) => void;
  /** Resolves once every enqueued sentence was emitted, skipped, or dropped by abort. */
  drain: () => Promise<void>;
  enqueuedCount: () => number;
};

const DEFAULT_TTS_MAX_IN_FLIGHT = 3;

/**
 * Pipelined sentence TTS (C10): synthesis runs concurrently (bounded), `voice.audio`
 * is emitted strictly by ascending `seq`, and nothing is emitted once killSignal aborts.
 */
export function createSentenceAudioPipeline(
  opts: SentenceAudioPipelineOptions,
): SentenceAudioPipeline {
  const maxInFlight = Math.max(1, opts.maxInFlight ?? DEFAULT_TTS_MAX_IN_FLIGHT);
  let nextSeq = 0;
  let inFlight = 0;
  const waiting: Array<() => void> = [];
  let emitChain: Promise<void> = Promise.resolve();

  const acquire = async (): Promise<void> => {
    if (inFlight < maxInFlight) {
      inFlight += 1;
      return;
    }
    await new Promise<void>((resolve) => waiting.push(resolve));
  };

  const release = (): void => {
    const next = waiting.shift();
    if (next) {
      next();
    } else {
      inFlight -= 1;
    }
  };

  const synthesizeBounded = async (sentence: string): Promise<SentenceAudio | null> => {
    await acquire();
    try {
      if (opts.killSignal.aborted) return null;
      return await opts.synthesize(sentence);
    } catch (error) {
      console.error("[voice/turn] result TTS failed (text still emitted):", error);
      return null;
    } finally {
      release();
    }
  };

  return {
    enqueue(sentence) {
      if (opts.killSignal.aborted || !sentence.trim()) return;
      const seq = nextSeq;
      nextSeq += 1;
      const audio = synthesizeBounded(sentence);
      emitChain = emitChain.then(async () => {
        const result = await audio;
        if (!result || !result.audioBase64 || opts.killSignal.aborted) return;
        opts.emit(
          stampFirstAudio(opts.clock, {
            type: "voice.audio",
            turnId: opts.turnId,
            phase: "result",
            audioBase64: result.audioBase64,
            mimeType: result.mimeType,
            ts: nowIso(),
            seq,
          }),
        );
      });
    },
    drain: () => emitChain,
    enqueuedCount: () => nextSeq,
  };
}

async function synthesizeResultSentence(sentence: string): Promise<SentenceAudio> {
  const tts = await defaultTtsAdapter(sentence, { phase: "result" });
  return { audioBase64: tts.audio.toString("base64"), mimeType: tts.mimeType };
}

function createTurnSentencePipeline(
  turnId: string,
  killSignal: AbortSignal,
  clock: TurnAudioClock,
): SentenceAudioPipeline {
  return createSentenceAudioPipeline({
    turnId,
    killSignal,
    clock,
    synthesize: synthesizeResultSentence,
    emit: emitVoiceEvent,
  });
}

async function synthesizeAndEmitAudio(
  turnId: string,
  phase: "ack" | "result",
  text: string,
  clock?: TurnAudioClock,
  killSignal?: AbortSignal,
): Promise<VoiceTurnAudioBlob | null> {
  try {
    const tts = await defaultTtsAdapter(text, { phase });
    // Mock 440 Hz beep for ack+result sounds like "two beeps" — skip ack tone.
    if (tts.mocked && phase === "ack") {
      return null;
    }
    if (killSignal?.aborted) return null;
    const event = stampFirstAudio(clock, {
      type: "voice.audio",
      turnId,
      phase,
      audioBase64: tts.audio.toString("base64"),
      mimeType: tts.mimeType,
      ts: nowIso(),
    });
    emitVoiceEvent(event);
    return { audioBase64: event.audioBase64, mimeType: event.mimeType };
  } catch (error) {
    // Text events must still reach the HUD even when every TTS provider fails.
    console.error(`[voice/turn] ${phase} TTS failed (text still emitted):`, error);
    return null;
  }
}

async function synthesizeAudioBlob(
  text: string,
  phase: "ack" | "result",
): Promise<VoiceTurnAudioBlob> {
  try {
    const tts = await defaultTtsAdapter(text, { phase });
    return {
      audioBase64: tts.audio.toString("base64"),
      mimeType: tts.mimeType,
    };
  } catch (error) {
    console.error(`[voice/turn] sync ${phase} TTS failed, using empty audio:`, error);
    return { audioBase64: "", mimeType: "audio/wav" };
  }
}

function trackPendingTurn(work: Promise<void>): void {
  pendingTurns.add(work);
  void work.finally(() => {
    pendingTurns.delete(work);
  });
}

function isConfirmUtterance(transcript: string): boolean {
  return /^(yes|yeah|yep|confirm|go ahead|proceed|do it|please do)\b/i.test(
    transcript.trim(),
  );
}

function resolveAgentTurnInput(
  turnId: string,
  transcript: string,
): { turnId: string; transcript: string; confirmed?: boolean; runId?: string } {
  if (pendingVoiceConfirm && isConfirmUtterance(transcript)) {
    const pending = pendingVoiceConfirm;
    pendingVoiceConfirm = null;
    return {
      turnId,
      transcript: pending.transcript,
      confirmed: true,
      runId: pending.runId,
    };
  }

  pendingVoiceConfirm = null;
  return { turnId, transcript };
}

function storePendingConfirm(
  turnId: string,
  transcript: string,
  output: JarvisAgentRunOutput,
): void {
  if (output.terminalReason === "awaiting_confirm") {
    pendingVoiceConfirm = {
      runId: output.runId,
      turnId,
      transcript,
    };
  }
}

async function completeTurnInBackground(
  turnId: string,
  handle: ProcessTurnHandle,
  killSignal: AbortSignal,
  clock: TurnAudioClock,
): Promise<void> {
  try {
    const result = await handle.complete;
    if (killSignal.aborted) return;
    emitKernelEvents(result.events);
    emitMemoryBrainEventsFromToolCalls(result.toolCalls);
    const pipeline = createTurnSentencePipeline(turnId, killSignal, clock);
    for (const sentence of splitIntoSentences(result.resultText)) {
      pipeline.enqueue(sentence);
    }
    await pipeline.drain();
  } catch (error) {
    console.error("[voice/turn] background complete failed:", error);
    emitVoiceEvent({
      type: "voice.state",
      turnId,
      state: "idle",
      ts: nowIso(),
    });
  }
}

async function completeAgentTurnInBackground(
  turnId: string,
  transcript: string,
  killSignal: AbortSignal,
  clock: TurnAudioClock,
): Promise<void> {
  const pipeline = createTurnSentencePipeline(turnId, killSignal, clock);
  try {
    const agentInput = resolveAgentTurnInput(turnId, transcript);
    const result = await runJarvisAgent({
      ...agentInput,
      killSignal,
      onSpeakableSentence: (sentence) => {
        pipeline.enqueue(sentence);
      },
    });
    await pipeline.drain();
    if (killSignal.aborted || result.terminalReason === "killed") {
      emitVoiceEvent({
        type: "voice.state",
        turnId,
        state: "idle",
        ts: nowIso(),
      });
      return;
    }
    storePendingConfirm(turnId, agentInput.transcript, result);
    emitKernelEvents(result.events);
    emitMemoryBrainEventsFromToolCalls(result.toolCalls);
    if (result.spokenSentenceCount === 0) {
      pipeline.enqueue(result.resultText);
      await pipeline.drain();
    }
  } catch (error) {
    if (killSignal.aborted) {
      emitVoiceEvent({
        type: "voice.state",
        turnId,
        state: "idle",
        ts: nowIso(),
      });
      return;
    }
    console.error("[voice/turn] agent background complete failed:", error);
    emitVoiceEvent({
      type: "voice.state",
      turnId,
      state: "idle",
      ts: nowIso(),
    });
  }
}

async function handleVoiceTurnSyncLegacy(
  turnId: string,
  transcript: string,
): Promise<Response> {
  const output = await processTurnSync(
    { turnId, transcript, ts: nowIso() },
    createDefaultDeps(),
  );

  const [ackAudio, resultAudio] = await Promise.all([
    synthesizeAudioBlob(output.ackText, "ack"),
    synthesizeAudioBlob(output.resultText, "result"),
  ]);

  emitMemoryBrainEventsFromToolCalls(output.toolCalls);
  emitPhase7BrainMemoryFallbackIfNeeded(turnId, output.toolCalls);

  const body: VoiceTurnSyncResponse = {
    mode: "sync-mock",
    turnId,
    transcript,
    ackText: output.ackText,
    resultText: output.resultText,
    globeState: output.globeState,
    toolCalls: output.toolCalls,
    ackAudio,
    resultAudio,
  };

  return Response.json(body);
}

async function handleVoiceTurnSyncAgent(
  turnId: string,
  transcript: string,
): Promise<Response> {
  const agentInput = resolveAgentTurnInput(turnId, transcript);
  const output = await runJarvisAgent(agentInput);
  storePendingConfirm(turnId, agentInput.transcript, output);

  const [ackAudio, resultAudio] = await Promise.all([
    synthesizeAudioBlob(output.ackText, "ack"),
    synthesizeAudioBlob(output.resultText, "result"),
  ]);

  emitMemoryBrainEventsFromToolCalls(output.toolCalls);
  emitPhase7BrainMemoryFallbackIfNeeded(turnId, output.toolCalls);

  const body: VoiceTurnSyncResponse = {
    mode: "sync-mock",
    turnId,
    transcript,
    ackText: output.ackText,
    resultText: output.resultText,
    globeState: output.globeState,
    toolCalls: output.toolCalls,
    ackAudio,
    resultAudio,
  };

  return Response.json(body);
}

async function handleVoiceTurnSync(
  turnId: string,
  transcript: string,
): Promise<Response> {
  if (isPhase11AgentEnabled()) {
    return handleVoiceTurnSyncAgent(turnId, transcript);
  }
  return handleVoiceTurnSyncLegacy(turnId, transcript);
}

async function handleVoiceTurnLiveLegacy(
  turnId: string,
  transcript: string,
  clock: TurnAudioClock,
): Promise<Response> {
  const killSignal = beginLiveTurnAbort();
  emitUserTranscript(turnId, transcript);

  const handle = processTurn(
    { turnId, transcript, ts: nowIso() },
    createDefaultDeps(),
  );
  emitKernelEvents(handle.ack.events);
  await synthesizeAndEmitAudio(turnId, "ack", handle.ack.ackText, clock, killSignal);

  trackPendingTurn(completeTurnInBackground(turnId, handle, killSignal, clock));

  const body: VoiceTurnAcceptedResponse = { turnId, transcript };
  return Response.json(body, { status: 202 });
}

async function handleVoiceTurnLiveAgent(
  turnId: string,
  transcript: string,
  clock: TurnAudioClock,
): Promise<Response> {
  const killSignal = beginLiveTurnAbort();
  emitUserTranscript(turnId, transcript);

  const ackText = buildAckText(transcript);
  emitFastAck(turnId, ackText);
  await synthesizeAndEmitAudio(turnId, "ack", ackText, clock, killSignal);

  trackPendingTurn(completeAgentTurnInBackground(turnId, transcript, killSignal, clock));

  const body: VoiceTurnAcceptedResponse = { turnId, transcript };
  return Response.json(body, { status: 202 });
}

async function handleVoiceTurnLive(
  turnId: string,
  transcript: string,
  clock: TurnAudioClock,
): Promise<Response> {
  if (isPhase11AgentEnabled()) {
    return handleVoiceTurnLiveAgent(turnId, transcript, clock);
  }
  return handleVoiceTurnLiveLegacy(turnId, transcript, clock);
}

/** Process PTT audio through STT → jarvis-kernel → TTS (Amendment A). */
export async function handleVoiceTurn(audio: Blob): Promise<Response> {
  if (isBargeInRequest(audio)) {
    abortActiveVoiceTurn();
    emitVoiceEvent({
      type: "voice.state",
      state: "idle",
      ts: nowIso(),
    });
    return Response.json({ mode: "barge-in", aborted: true });
  }

  const transcribed = await transcribeAudio(audio);
  const clock = startTurnAudioClock();
  const transcript = transcribed.text.trim();

  if (!transcript) {
    return Response.json({ error: "empty transcript" }, { status: 400 });
  }

  const turnId = randomUUID();

  if (isCiVoiceMockMode()) {
    return handleVoiceTurnSync(turnId, transcript);
  }

  return handleVoiceTurnLive(turnId, transcript, clock);
}

/** Await in-flight background turns (tests only). */
export async function waitForPendingVoiceTurns(): Promise<void> {
  await Promise.all([...pendingTurns]);
}

/** Test hook — clears conversational confirm state. */
export function resetPendingVoiceConfirmForTests(): void {
  pendingVoiceConfirm = null;
  abortActiveVoiceTurn();
}
