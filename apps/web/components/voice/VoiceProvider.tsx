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

import type { VoiceTranscriptRole } from "@zeref/contracts";

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

type VoiceContextValue = {
  voiceState: VoiceGlobeState;
  micLevel: number;
  outputLevel: number;
  transcripts: TranscriptLine[];
  telemetryLive: boolean;
  submitPttAudio: (blob: Blob) => Promise<void>;
  setListening: (active: boolean) => void;
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
  const [voiceState, setVoiceState] = useState<VoiceGlobeState>("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [telemetryLive, setTelemetryLive] = useState(false);

  const playbackQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activeTurnRef = useRef<string | null>(null);
  const receivedPhasesRef = useRef<Set<string>>(new Set());

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

  const handleSyncMockTurn = useCallback(
    (body: VoiceTurnSyncResponse) => {
      activeTurnRef.current = body.turnId;
      receivedPhasesRef.current.clear();

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
    [appendTranscript, enqueuePlayback],
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

  useEffect(() => {
    const source = new EventSource("/api/v1/events/stream");

    source.addEventListener("voice.state", (event) => {
      try {
        const parsed = parseVoiceStateEvent(JSON.parse(event.data));
        setVoiceState(parsed.state);
        if (parsed.simulated === false) setTelemetryLive(true);
      } catch {
        /* ignore malformed */
      }
    });

    source.addEventListener("voice.transcript", (event) => {
      try {
        const parsed = parseVoiceTranscriptEvent(JSON.parse(event.data));
        appendTranscript({
          role: parsed.role,
          text: parsed.text,
          turnId: parsed.turnId,
        });
        setTelemetryLive(true);
      } catch {
        /* ignore */
      }
    });

    source.addEventListener("voice.audio", (event) => {
      try {
        handleVoiceAudio(parseVoiceAudioEvent(JSON.parse(event.data)));
        setTelemetryLive(true);
      } catch {
        /* ignore */
      }
    });

    source.addEventListener("pipeline", (event) => {
      try {
        const parsed = parsePipelineEvent(JSON.parse(event.data));
        if (!parsed.simulated) setTelemetryLive(true);
      } catch {
        /* ignore */
      }
    });

    return () => {
      source.close();
    };
  }, [appendTranscript, handleVoiceAudio]);

  const value = useMemo(
    () => ({
      voiceState,
      micLevel,
      outputLevel,
      transcripts,
      telemetryLive,
      submitPttAudio,
      setListening,
    }),
    [
      voiceState,
      micLevel,
      outputLevel,
      transcripts,
      telemetryLive,
      submitPttAudio,
      setListening,
    ],
  );

  return (
    <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
  );
}
