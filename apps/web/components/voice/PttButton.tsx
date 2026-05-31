"use client";

import { useCallback, useRef } from "react";

import { cn } from "@/lib/cn";

import { useVoice } from "./VoiceProvider";

export function PttButton(): React.ReactElement {
  const { submitPttAudio, setListening } = useVoice();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const handlePointerDown = useCallback(async () => {
    setListening(true);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.start();
    } catch {
      setListening(false);
    }
  }, [setListening]);

  const handlePointerUp = useCallback(async () => {
    setListening(false);
    const recorder = recorderRef.current;
    recorderRef.current = null;

    if (!recorder || recorder.state === "inactive") {
      stopStream();
      return;
    }

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    stopStream();

    const blob = new Blob(chunksRef.current, {
      type: recorder.mimeType || "audio/webm",
    });
    chunksRef.current = [];

    if (blob.size === 0) return;

    try {
      await submitPttAudio(blob);
    } catch {
      /* surfaced via voice state reset */
    }
  }, [setListening, stopStream, submitPttAudio]);

  return (
    <button
      type="button"
      data-testid="ptt-button"
      aria-label="Hold to talk to Jarvis"
      className={cn(
        "rounded border border-hud-cyan/40 bg-hud-cyan/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-hud-cyan",
        "select-none touch-none transition-colors hover:bg-hud-cyan/20 active:bg-hud-cyan/30",
      )}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        void handlePointerDown();
      }}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        void handlePointerUp();
      }}
      onPointerCancel={() => {
        void handlePointerUp();
      }}
    >
      Hold to talk
    </button>
  );
}
