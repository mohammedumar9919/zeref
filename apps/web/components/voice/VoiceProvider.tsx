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

import type { VoiceTranscriptRole } from "@zeref/contracts";

import {
  BRAIN_STATE_IDLE_MS,
  brainStateFromMemoryEvent,
  type BrainGlobeState,
} from "@/components/brain/brain-state";
import { parseMemoryBrainEvent } from "@/components/brain/parse-brain-events";
import { parseTelemetryEvent } from "@/lib/events";
import { decodeAudioBase64, playAudioBlob } from "@/lib/voice/audio-playback";
import {
  parsePipelineEvent,
  parseVoiceAudioEvent,
  parseVoiceStateEvent,
  parseVoiceTranscriptEvent,
  type VoiceGlobeState,
} from "@/lib/voice/parse-voice-events";
import type { VoiceTurnSyncResponse } from "@/lib/voice/types";

export type TranscriptLine = {
  id: string;
  role: VoiceTranscriptRole | "user";
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
  | "memory.entity_changed";

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

  const streamSubscribersRef = useRef<Set<StreamEventHandler>>(new Set());
  const playbackQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activeTurnRef = useRef<string | null>(null);
  const receivedPhasesRef = useRef<Set<string>>(new Set());
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

  const appendTranscript = useCallback(
    (line: Omit<TranscriptLine, "id">) => {
      setTranscripts((prev) => [
        ...prev.slice(-20),
        { ...line, id: `${line.turnId ?? "x"}-${line.role}-${prev.length}` },
      ]);
    },
    [],
  );

  const enqueuePlayback = useCallback(
    (audioBase64: string, mimeType: string) => {
      playbackQueueRef.current = playbackQueueRef.current
        .then(async () => {
          setVoiceState("speaking");
          const blob = decodeAudioBase64(audioBase64, mimeType);
          await playAudioBlob(blob, setOutputLevel);
        })
        .catch(() => {
          setOutputLevel(0);
        })
        .finally(() => {
          setOutputLevel(0);
          setVoiceState("idle");
        });
    },
    [],
  );

  const handleVoiceAudio = useCallback(
    (event: ReturnType<typeof parseVoiceAudioEvent>) => {
      if (
        activeTurnRef.current &&
        event.turnId !== activeTurnRef.current
      ) {
        return;
      }

      const phaseKey = `${event.turnId}:${event.phase}`;
      if (receivedPhasesRef.current.has(phaseKey)) return;
      receivedPhasesRef.current.add(phaseKey);

      if (event.phase === "result") {
        setVoiceState("thinking");
      }

      enqueuePlayback(event.audioBase64, event.mimeType);
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
      receivedPhasesRef.current.clear();

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

      enqueuePlayback(body.ackAudio.audioBase64, body.ackAudio.mimeType);
      enqueuePlayback(body.resultAudio.audioBase64, body.resultAudio.mimeType);
    },
    [appendTranscript, applyBrainEventsFromToolCalls, enqueuePlayback],
  );

  const submitPttAudio = useCallback(
    async (blob: Blob) => {
      setMicLevel(0);
      setVoiceState("thinking");

      const form = new FormData();
      form.append("audio", blob, "ptt.webm");

      const res = await fetch("/api/v1/voice/turn", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
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
        receivedPhasesRef.current.clear();
        appendTranscript({
          role: "user",
          text: body.transcript,
          turnId: body.turnId,
        });
        setTelemetryLive(true);
        setVoiceState("thinking");
        return;
      }

      setVoiceState("idle");
    },
    [appendTranscript, handleSyncMockTurn],
  );

  const setListening = useCallback((active: boolean) => {
    setVoiceState(active ? "listening" : "idle");
    if (active) {
      setMicLevel(0.65);
    } else {
      setMicLevel(0);
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
    const source = new EventSource("/api/v1/events/stream");

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

    source.onerror = () => {
      setTelemetryMessage("Telemetry stream unavailable");
      setTelemetrySimulated(true);
      source.close();
    };

    return () => {
      if (brainIdleTimerRef.current) {
        clearTimeout(brainIdleTimerRef.current);
      }
      source.close();
    };
  }, [
    appendTranscript,
    emitStreamEvent,
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
      subscribeStreamEvents,
    ],
  );

  return (
    <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
  );
}
