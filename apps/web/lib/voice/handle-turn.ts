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
  type ProcessTurnHandle,
} from "@zeref/jarvis-kernel";

import {
  isPhase11AgentEnabled,
  runJarvisAgent,
  type JarvisAgentRunOutput,
} from "../jarvis/agent-runtime";
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

async function synthesizeAndEmitAudio(
  turnId: string,
  phase: "ack" | "result",
  text: string,
): Promise<VoiceTurnAudioBlob> {
  const tts = await defaultTtsAdapter(text, { phase });
  const event: VoiceAudioEvent = {
    type: "voice.audio",
    turnId,
    phase,
    audioBase64: tts.audio.toString("base64"),
    mimeType: tts.mimeType,
    ts: nowIso(),
  };
  emitVoiceEvent(event);
  return { audioBase64: event.audioBase64, mimeType: event.mimeType };
}

async function synthesizeAudioBlob(
  text: string,
  phase: "ack" | "result",
): Promise<VoiceTurnAudioBlob> {
  const tts = await defaultTtsAdapter(text, { phase });
  return {
    audioBase64: tts.audio.toString("base64"),
    mimeType: tts.mimeType,
  };
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
): Promise<void> {
  try {
    const result = await handle.complete;
    emitKernelEvents(result.events);
    emitMemoryBrainEventsFromToolCalls(result.toolCalls);
    await synthesizeAndEmitAudio(turnId, "result", result.resultText);
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
): Promise<void> {
  try {
    const agentInput = resolveAgentTurnInput(turnId, transcript);
    const result = await runJarvisAgent(agentInput);
    storePendingConfirm(turnId, agentInput.transcript, result);
    emitKernelEvents(result.events);
    emitMemoryBrainEventsFromToolCalls(result.toolCalls);
    await synthesizeAndEmitAudio(turnId, "result", result.resultText);
  } catch (error) {
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
): Promise<Response> {
  emitUserTranscript(turnId, transcript);

  const handle = processTurn(
    { turnId, transcript, ts: nowIso() },
    createDefaultDeps(),
  );
  emitKernelEvents(handle.ack.events);
  await synthesizeAndEmitAudio(turnId, "ack", handle.ack.ackText);

  trackPendingTurn(completeTurnInBackground(turnId, handle));

  const body: VoiceTurnAcceptedResponse = { turnId, transcript };
  return Response.json(body, { status: 202 });
}

async function handleVoiceTurnLiveAgent(
  turnId: string,
  transcript: string,
): Promise<Response> {
  emitUserTranscript(turnId, transcript);

  const ackText = buildAckText(transcript);
  emitFastAck(turnId, ackText);
  await synthesizeAndEmitAudio(turnId, "ack", ackText);

  trackPendingTurn(completeAgentTurnInBackground(turnId, transcript));

  const body: VoiceTurnAcceptedResponse = { turnId, transcript };
  return Response.json(body, { status: 202 });
}

async function handleVoiceTurnLive(
  turnId: string,
  transcript: string,
): Promise<Response> {
  if (isPhase11AgentEnabled()) {
    return handleVoiceTurnLiveAgent(turnId, transcript);
  }
  return handleVoiceTurnLiveLegacy(turnId, transcript);
}

/** Process PTT audio through STT → jarvis-kernel → TTS (Amendment A). */
export async function handleVoiceTurn(audio: Blob): Promise<Response> {
  const transcribed = await transcribeAudio(audio);
  const transcript = transcribed.text.trim();

  if (!transcript) {
    return Response.json({ error: "empty transcript" }, { status: 400 });
  }

  const turnId = randomUUID();

  if (isCiVoiceMockMode()) {
    return handleVoiceTurnSync(turnId, transcript);
  }

  return handleVoiceTurnLive(turnId, transcript);
}

/** Await in-flight background turns (tests only). */
export async function waitForPendingVoiceTurns(): Promise<void> {
  await Promise.all([...pendingTurns]);
}

/** Test hook — clears conversational confirm state. */
export function resetPendingVoiceConfirmForTests(): void {
  pendingVoiceConfirm = null;
}
