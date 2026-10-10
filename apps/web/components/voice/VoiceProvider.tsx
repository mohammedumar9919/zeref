"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import type {
  AgentStep,
  VoiceLatencySample,
  VoiceTranscriptRole,
} from "@zeref/contracts";

import {
  BRAIN_STATE_IDLE_MS,
  brainStateFromMemoryEvent,
  type BrainGlobeState,
} from "@/components/brain/brain-state";
import { parseMemoryBrainEvent } from "@/components/brain/parse-brain-events";
import { parseTelemetryEvent } from "@/lib/events";
import { decodeAudioBase64, playAudioBlob, stopAllPlayback } from "@/lib/voice/audio-playback";
import { BARGE_IN_MIME, createBargeInBlob } from "@/lib/voice/barge-in";
import {
  agentStepHudLabel,
  parseAgentStepEvent,
  parsePipelineEvent,
  parseVoiceAudioEvent,
  parseVoiceStateEvent,
  parseVoiceTranscriptEvent,
  type VoiceGlobeState,
} from "@/lib/voice/parse-voice-events";
import type { VoiceTurnSyncResponse } from "@/lib/voice/types";

export type TranscriptSource = "voice" | "typed";

export type TranscriptLine = {
  id: string;
  role: VoiceTranscriptRole | "user";
  text: string;
  turnId?: string;
  source?: TranscriptSource;
};

export type TypedTranscriptLine = {
  role: "user" | "assistant";
  text: string;
  turnId?: string;
};

export type StreamEventType =
  | "telemetry"
  | "voice.state"
  | "voice.transcript"
  | "voice.audio"
  | "pipeline"
  | "memory.saved"
  | "memory.search"
  | "memory.contradiction"
  | "memory.entity_changed"
  | "agent.step"
  | "jarvis.fact_card";

export type StreamEventHandler = (eventType: StreamEventType, data: unknown) => void;

type VoiceContextValue = {
  voiceState: VoiceGlobeState;
  brainState: BrainGlobeState;
  micLevel: number;
  outputLevel: number;
  transcripts: TranscriptLine[];
  telemetryLive: boolean;
  telemetryMessage: string;
  telemetrySimulated: boolean;
  submitPttAudio: (blob: Blob) => Promise<void>;
  setListening: (active: boolean) => void;
  bargeIn: () => Promise<void>;
  appendTypedTranscript: (line: TypedTranscriptLine) => void;
  agentStepLabel: string | null;
  subscribeStreamEvents: (handler: StreamEventHandler) => () => void;
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    throw new Error("useVoice must be used within VoiceProvider");
  }
  return ctx;
}

type VoiceProviderProps = {
  children: ReactNode;
};

export function VoiceProvider({ children }: VoiceProviderProps): React.ReactElement {
  const pathname = usePathname();
  const [voiceState, setVoiceState] = useState<VoiceGlobeState>("idle");
  const [brainState, setBrainState] = useState<BrainGlobeState>("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [telemetryLive, setTelemetryLive] = useState(false);
  const [telemetryMessage, setTelemetryMessage] = useState(
    "Awaiting telemetry stream…",
  );
  const [telemetrySimulated, setTelemetrySimulated] = useState(true);
  const [agentStepLabel, setAgentStepLabel] = useState<string | null>(null);

  const streamSubscribersRef = useRef<Set<StreamEventHandler>>(new Set());
  const playbackQueueRef = useRef<Promise<void>>(Promise.resolve());
  const playbackGenerationRef = useRef(0);
  const activeTurnRef = useRef<string | null>(null);
  const receivedAckRef = useRef<Set<string>>(new Set());
  const brainIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyBrainState = useCallback((next: BrainGlobeState) => {
    setBrainState(next);
    if (brainIdleTimerRef.current) {
      clearTimeout(brainIdleTimerRef.current);
      brainIdleTimerRef.current = null;
    }
    if (next !== "idle") {
      brainIdleTimerRef.current = setTimeout(() => {
        setBrainState("idle");
        brainIdleTimerRef.current = null;
      }, BRAIN_STATE_IDLE_MS);
    }
  }, []);

  const brainStateRef = useRef(brainState);
  brainStateRef.current = brainState;

  useEffect(() => {
    const state = brainStateRef.current;
    if (state !== "idle") {
      applyBrainState(state);
    }
  }, [pathname, applyBrainState]);

  const handleMemoryBrainEvent = useCallback(
    (data: unknown) => {
      try {
        const parsed = parseMemoryBrainEvent(data);
        applyBrainState(brainStateFromMemoryEvent(parsed));
        if (parsed.simulated === false) {
          setTelemetryLive(true);
        }
      } catch {
        /* ignore malformed */
      }
    },
    [applyBrainState],
  );

  const transcriptSeqRef = useRef(0);

  const appendTranscript = useCallback(
    (line: Omit<TranscriptLine, "id">) => {
      transcriptSeqRef.current += 1;
      const seq = transcriptSeqRef.current;
      setTranscripts((prev) => [
        ...prev.slice(-20),
        { ...line, id: `${line.turnId ?? "x"}-${line.role}-${seq}` },
      ]);
    },
    [],
  );

  const appendTypedTranscript = useCallback(
    (line: TypedTranscriptLine) => {
      appendTranscript({ ...line, source: "typed" });
    },
    [appendTranscript],
  );

  const pttReleasedAtRef = useRef<number | null>(null);
  const firstAudioPendingRef = useRef<{
    releasedAt: number;
    priorTurnId: string | null;
  } | null>(null);

  /** PTT release → first reply audio `playing`; one real sample per turn, never synthesized. */
  const reportFirstAudio = useCallback((turnId: string | undefined) => {
    const pending = firstAudioPendingRef.current;
    if (!pending || !turnId || turnId === pending.priorTurnId) return;
    firstAudioPendingRef.current = null;
    const sample: VoiceLatencySample = {
      turnId,
      firstAudioMs: Math.max(0, Math.round(performance.now() - pending.releasedAt)),
      source: "client",
    };
    void fetch("/api/v1/ops/voice-latency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sample),
      keepalive: true,
    }).catch(() => {
      /* latency sample is best-effort */
    });
  }, []);

  const enqueuePlayback = useCallback(
    (audioBase64: string, mimeType: string, turnId?: string) => {
      const generation = playbackGenerationRef.current;
      playbackQueueRef.current = playbackQueueRef.current
        .then(async () => {
          if (generation !== playbackGenerationRef.current) return;
          setVoiceState("speaking");
          const blob = decodeAudioBase64(audioBase64, mimeType);
          await playAudioBlob(blob, setOutputLevel, {
            onPlaying: () => reportFirstAudio(turnId),
          });
        })
        .catch(() => {
          setOutputLevel(0);
        })
        .finally(() => {
          if (generation !== playbackGenerationRef.current) return;
          setOutputLevel(0);
          setVoiceState("idle");
        });
    },
    [reportFirstAudio],
  );

  const handleVoiceAudio = useCallback(
    (event: ReturnType<typeof parseVoiceAudioEvent>) => {
      if (
        activeTurnRef.current &&
        event.turnId !== activeTurnRef.current
      ) {
        return;
      }

      if (event.phase === "ack") {
        const ackKey = `${event.turnId}:ack`;
        if (receivedAckRef.current.has(ackKey)) return;
        receivedAckRef.current.add(ackKey);
      }

      enqueuePlayback(event.audioBase64, event.mimeType, event.turnId);
    },
    [enqueuePlayback],
  );

  const applyBrainEventsFromToolCalls = useCallback(
    (toolCalls: VoiceTurnSyncResponse["toolCalls"]) => {
      for (const call of toolCalls) {
        const result = call.result;
        if (!result || typeof result !== "object") continue;
        const brainEvent = (result as { brainEvent?: unknown }).brainEvent;
        if (brainEvent) {
          handleMemoryBrainEvent(brainEvent);
        }
      }
    },
    [handleMemoryBrainEvent],
  );

  const handleSyncMockTurn = useCallback(
    (body: VoiceTurnSyncResponse) => {
      activeTurnRef.current = body.turnId;
      receivedAckRef.current.clear();

      applyBrainEventsFromToolCalls(body.toolCalls);

      appendTranscript({ role: "user", text: body.transcript, turnId: body.turnId });
      appendTranscript({ role: "ack", text: body.ackText, turnId: body.turnId });
      appendTranscript({
        role: "assistant",
        text: body.resultText,
        turnId: body.turnId,
      });

      setVoiceState("thinking");
      setTelemetryLive(true);

      enqueuePlayback(body.ackAudio.audioBase64, body.ackAudio.mimeType, body.turnId);
      enqueuePlayback(body.resultAudio.audioBase64, body.resultAudio.mimeType, body.turnId);
    },
    [appendTranscript, applyBrainEventsFromToolCalls, enqueuePlayback],
  );

  const submitPttAudio = useCallback(
    async (blob: Blob) => {
      setMicLevel(0);
      setVoiceState("thinking");

      firstAudioPendingRef.current = {
        releasedAt: pttReleasedAtRef.current ?? performance.now(),
        priorTurnId: activeTurnRef.current,
      };
      pttReleasedAtRef.current = null;
      // The live ack is emitted over SSE before the 202 names the new turn; don't drop it.
      activeTurnRef.current = null;

      const form = new FormData();
      form.append("audio", blob, "ptt.webm");

      const res = await fetch("/api/v1/voice/turn", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        firstAudioPendingRef.current = null;
        setVoiceState("idle");
        throw new Error(`voice turn failed: ${res.status}`);
      }

      if (res.status === 200) {
        const body = (await res.json()) as VoiceTurnSyncResponse;
        if (body.mode === "sync-mock") {
          handleSyncMockTurn(body);
          return;
        }
      }

      if (res.status === 202) {
        const body = (await res.json()) as { turnId: string; transcript: string };
        activeTurnRef.current = body.turnId;
        receivedAckRef.current.clear();
        appendTranscript({
          role: "user",
          text: body.transcript,
          turnId: body.turnId,
        });
        setTelemetryLive(true);
        setVoiceState("thinking");
        return;
      }

      firstAudioPendingRef.current = null;
      setVoiceState("idle");
    },
    [appendTranscript, handleSyncMockTurn],
  );

  const setListening = useCallback((active: boolean) => {
    setVoiceState(active ? "listening" : "idle");
    if (active) {
      pttReleasedAtRef.current = null;
      setMicLevel(0.65);
    } else {
      pttReleasedAtRef.current = performance.now();
      setMicLevel(0);
    }
  }, []);

  const bargeIn = useCallback(async () => {
    firstAudioPendingRef.current = null;
    playbackGenerationRef.current += 1;
    stopAllPlayback();
    playbackQueueRef.current = Promise.resolve();
    setOutputLevel(0);
    setVoiceState("idle");
    setAgentStepLabel("KILLED");
    try {
      const form = new FormData();
      form.append("audio", createBargeInBlob(), "barge-in");
      await fetch("/api/v1/voice/turn", {
        method: "POST",
        body: form,
        headers: { "X-Zeref-Barge-In": BARGE_IN_MIME },
      });
    } catch {
      /* playback already stopped */
    }
  }, []);

  const subscribeStreamEvents = useCallback((handler: StreamEventHandler) => {
    streamSubscribersRef.current.add(handler);
    return () => {
      streamSubscribersRef.current.delete(handler);
    };
  }, []);

  const emitStreamEvent = useCallback(
    (eventType: StreamEventType, data: unknown) => {
      for (const handler of streamSubscribersRef.current) {
        handler(eventType, data);
      }
    },
    [],
  );

  const handleAgentStep = useCallback(
    (data: unknown) => {
      try {
        const parsed: AgentStep = parseAgentStepEvent(data);
        setAgentStepLabel(agentStepHudLabel(parsed));
        if (parsed.type === "killed") {
          playbackGenerationRef.current += 1;
          stopAllPlayback();
          setOutputLevel(0);
        }
        emitStreamEvent("agent.step", parsed);
      } catch {
        /* ignore malformed */
      }
    },
    [emitStreamEvent],
  );

  const handleTelemetryEvent = useCallback(
    (data: unknown) => {
      try {
        const parsed = parseTelemetryEvent(data);
        setTelemetryMessage(parsed.message);
        setTelemetrySimulated(parsed.simulated);
        emitStreamEvent("telemetry", parsed);
      } catch {
        setTelemetryMessage("Telemetry parse error");
      }
    },
    [emitStreamEvent],
  );

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;
    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const connect = (): void => {
      if (cancelled) return;

      source = new EventSource("/api/v1/events/stream");

      source.addEventListener("telemetry", (event) => {
        handleTelemetryEvent(JSON.parse(event.data));
      });

      source.addEventListener("voice.state", (event) => {
        try {
          const data = JSON.parse(event.data);
          const parsed = parseVoiceStateEvent(data);
          setVoiceState(parsed.state);
          if (parsed.simulated === false) {
            setTelemetryLive(true);
            setTelemetrySimulated(false);
          }
          emitStreamEvent("voice.state", parsed);
        } catch {
          /* ignore malformed */
        }
      });

      source.addEventListener("voice.transcript", (event) => {
        try {
          const data = JSON.parse(event.data);
          const parsed = parseVoiceTranscriptEvent(data);
          appendTranscript({
            role: parsed.role,
            text: parsed.text,
            turnId: parsed.turnId,
          });
          setTelemetryLive(true);
          emitStreamEvent("voice.transcript", parsed);
        } catch {
          /* ignore */
        }
      });

      source.addEventListener("voice.audio", (event) => {
        try {
          const data = JSON.parse(event.data);
          const parsed = parseVoiceAudioEvent(data);
          handleVoiceAudio(parsed);
          setTelemetryLive(true);
          emitStreamEvent("voice.audio", parsed);
        } catch {
          /* ignore */
        }
      });

      source.addEventListener("pipeline", (event) => {
        try {
          const data = JSON.parse(event.data);
          const parsed = parsePipelineEvent(data);
          if (!parsed.simulated) {
            setTelemetryLive(true);
            setTelemetrySimulated(false);
          }
          emitStreamEvent("pipeline", parsed);
        } catch {
          /* ignore */
        }
      });

      source.addEventListener("memory.saved", (event) => {
        const data = JSON.parse(event.data);
        handleMemoryBrainEvent(data);
        emitStreamEvent("memory.saved", data);
      });

      source.addEventListener("memory.search", (event) => {
        const data = JSON.parse(event.data);
        handleMemoryBrainEvent(data);
        emitStreamEvent("memory.search", data);
      });

      source.addEventListener("memory.contradiction", (event) => {
        const data = JSON.parse(event.data);
        handleMemoryBrainEvent(data);
        emitStreamEvent("memory.contradiction", data);
      });

      source.addEventListener("memory.entity_changed", (event) => {
        const data = JSON.parse(event.data);
        handleMemoryBrainEvent(data);
        emitStreamEvent("memory.entity_changed", data);
      });

      source.addEventListener("agent.step", (event) => {
        try {
          handleAgentStep(JSON.parse(event.data));
        } catch {
          /* ignore */
        }
      });

      source.addEventListener("jarvis.fact_card", (event) => {
        try {
          emitStreamEvent("jarvis.fact_card", JSON.parse(event.data));
        } catch {
          /* ignore malformed */
        }
      });

      source.onerror = () => {
        setTelemetryMessage("Telemetry stream unavailable");
        setTelemetrySimulated(true);
        source?.close();
      };
    };

    // Defer SSE until after first paint so cockpit chrome is interactive first.
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(connect, { timeout: 1200 });
    } else {
      timeoutHandle = setTimeout(connect, 0);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== undefined && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
      if (brainIdleTimerRef.current) {
        clearTimeout(brainIdleTimerRef.current);
      }
      source?.close();
    };
  }, [
    appendTranscript,
    emitStreamEvent,
    handleAgentStep,
    handleMemoryBrainEvent,
    handleTelemetryEvent,
    handleVoiceAudio,
  ]);

  const value = useMemo(
    () => ({
      voiceState,
      brainState,
      micLevel,
      outputLevel,
      transcripts,
      telemetryLive,
      telemetryMessage,
      telemetrySimulated,
      submitPttAudio,
      setListening,
      bargeIn,
      appendTypedTranscript,
      agentStepLabel,
      subscribeStreamEvents,
    }),
    [
      voiceState,
      brainState,
      micLevel,
      outputLevel,
      transcripts,
      telemetryLive,
      telemetryMessage,
      telemetrySimulated,
      submitPttAudio,
      setListening,
      bargeIn,
      appendTypedTranscript,
      agentStepLabel,
      subscribeStreamEvents,
    ],
  );

  return (
    <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
  );
}
