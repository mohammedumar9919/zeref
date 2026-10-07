"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { useVoice } from "@/components/voice/VoiceProvider";
import {
  TYPED_TURN_CANCEL_COPY,
  TYPED_TURN_ERROR_COPY,
  confirmTypedTurn,
  sendTypedTurn,
  type TypedPendingConfirm,
  type TypedTurnResult,
} from "@/lib/jarvis/typed-turn";

import { ConfirmCard } from "./ConfirmCard";

type PendingTurn = TypedPendingConfirm & {
  transcript: string;
  runId: string;
  question: string;
};

export function TypedComposer(): React.ReactElement {
  const { appendTypedTranscript } = useVoice();
  const [value, setValue] = useState("");
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyResult = useCallback(
    (transcript: string, result: TypedTurnResult) => {
      appendTypedTranscript({
        role: "assistant",
        text: result.resultText,
        turnId: result.runId,
      });
      if (result.pendingConfirm && result.runId) {
        setPending({
          ...result.pendingConfirm,
          transcript,
          runId: result.runId,
          question: result.resultText.replace(/\s*Say yes to confirm\.$/, ""),
        });
      } else {
        setPending(null);
      }
    },
    [appendTypedTranscript],
  );

  const failWith = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[typed-composer] jarvis run failed:", message);
    setRawError(message);
  }, []);

  const handleSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const transcript = value.trim();
      if (!transcript || running || pending) return;

      appendTypedTranscript({ role: "user", text: transcript });
      setValue("");
      setRawError(null);
      setRunning(true);
      try {
        applyResult(transcript, await sendTypedTurn(transcript));
      } catch (error) {
        failWith(error);
      } finally {
        setRunning(false);
      }
    },
    [appendTypedTranscript, applyResult, failWith, pending, running, value],
  );

  const handleApprove = useCallback(async () => {
    if (!pending || running) return;
    setRawError(null);
    setRunning(true);
    try {
      applyResult(pending.transcript, await confirmTypedTurn(pending.transcript, pending.runId));
    } catch (error) {
      failWith(error);
    } finally {
      setRunning(false);
    }
  }, [applyResult, failWith, pending, running]);

  const handleCancel = useCallback(() => {
    if (!pending) return;
    setPending(null);
    setRawError(null);
    appendTypedTranscript({
      role: "assistant",
      text: TYPED_TURN_CANCEL_COPY,
      turnId: pending.runId,
    });
  }, [appendTypedTranscript, pending]);

  const inputLocked = running || pending !== null;

  const wasLockedRef = useRef(false);
  useEffect(() => {
    if (wasLockedRef.current && !inputLocked) inputRef.current?.focus();
    wasLockedRef.current = inputLocked;
  }, [inputLocked]);

  return (
    <section
      data-testid="typed-composer"
      aria-label="Type to Jarvis"
      className="mx-auto max-w-[1600px] px-4 pb-2 md:px-6"
    >
      <div className="space-y-2 rounded-panel border border-hud-border/60 bg-void/80 p-3 backdrop-blur-md">
        {pending ? (
          <ConfirmCard
            pending={pending}
            label={pending.question}
            busy={running}
            onApprove={() => void handleApprove()}
            onCancel={handleCancel}
          />
        ) : null}
        <form className="flex items-center gap-2" onSubmit={(e) => void handleSubmit(e)}>
          <label htmlFor="typed-composer-input" className="sr-only">
            Message Jarvis
          </label>
          <input
            id="typed-composer-input"
            ref={inputRef}
            data-testid="typed-composer-input"
            type="text"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={inputLocked}
            placeholder={pending ? "Confirm or cancel the pending action" : "Type to Jarvis…"}
            className="min-w-0 flex-1 rounded border border-hud-border bg-panel/80 px-3 py-2 text-base text-hud-primary placeholder:text-hud-muted focus:border-hud-cyan/70 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            data-testid="typed-composer-send"
            disabled={inputLocked || value.trim().length === 0}
            className="rounded border border-hud-cyan/40 bg-hud-cyan/10 px-4 py-2 font-mono text-[13px] uppercase tracking-widest text-hud-cyan transition-colors hover:bg-hud-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "Thinking…" : "Send"}
          </button>
        </form>
        {rawError ? (
          <p
            data-testid="typed-composer-error"
            role="alert"
            title={rawError}
            className="font-mono text-[13px] text-hud-cyan/80"
          >
            {TYPED_TURN_ERROR_COPY}
          </p>
        ) : null}
      </div>
    </section>
  );
}
