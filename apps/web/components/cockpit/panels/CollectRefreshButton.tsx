"use client";

import { useCallback, useState } from "react";

import { ConfirmCard } from "@/components/hud/ConfirmCard";
import {
  TYPED_TURN_ERROR_COPY,
  confirmTypedTurn,
  sendTypedTurn,
  type TypedPendingConfirm,
  type TypedTurnResult,
} from "@/lib/jarvis/typed-turn";

const COLLECT_TRANSCRIPT = "collect latest instagram data";

type PendingCollect = TypedPendingConfirm & { runId: string; question: string };

type CollectOutcome = { text: string; simulated: boolean };

type RunToolCall = { name?: string; result?: { mocked?: boolean } | null };

/** The run route returns the kernel's tool calls; a mocked enqueue means nothing really ran. */
function isSimulatedResult(result: TypedTurnResult): boolean {
  const toolCalls = (result as TypedTurnResult & { toolCalls?: RunToolCall[] }).toolCalls ?? [];
  return toolCalls.some((call) => call.name === "enqueue_job" && call.result?.mocked === true);
}

/** Reports-panel "Refresh data": asks Jarvis to collect; runs only after the write-high Confirm. */
export function CollectRefreshButton(): React.ReactElement {
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState<PendingCollect | null>(null);
  const [outcome, setOutcome] = useState<CollectOutcome | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);

  const failWith = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[collect-refresh] jarvis run failed:", message);
    setRawError(message);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (running || pending) return;
    setOutcome(null);
    setRawError(null);
    setRunning(true);
    try {
      const result = await sendTypedTurn(COLLECT_TRANSCRIPT);
      if (result.pendingConfirm && result.runId) {
        setPending({
          ...result.pendingConfirm,
          runId: result.runId,
          question: result.resultText.replace(/\s*Say yes to confirm\.$/, ""),
        });
      } else {
        setOutcome({ text: result.resultText, simulated: isSimulatedResult(result) });
      }
    } catch (error) {
      failWith(error);
    } finally {
      setRunning(false);
    }
  }, [failWith, pending, running]);

  const handleApprove = useCallback(async () => {
    if (!pending || running) return;
    setRawError(null);
    setRunning(true);
    try {
      const result = await confirmTypedTurn(COLLECT_TRANSCRIPT, pending.runId);
      setPending(null);
      setOutcome({ text: result.resultText, simulated: isSimulatedResult(result) });
    } catch (error) {
      failWith(error);
    } finally {
      setRunning(false);
    }
  }, [failWith, pending, running]);

  const handleCancel = useCallback(() => {
    setPending(null);
    setRawError(null);
    setOutcome(null);
  }, []);

  return (
    <div className="space-y-2">
      <button
        type="button"
        data-testid="cockpit-collect-refresh"
        onClick={() => void handleRefresh()}
        disabled={running || pending !== null}
        className="rounded border border-hud-cyan/40 bg-hud-cyan/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-hud-cyan transition-colors hover:bg-hud-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running && !pending ? "Asking Jarvis…" : "Refresh data"}
      </button>
      {pending ? (
        <ConfirmCard
          pending={pending}
          label={pending.question}
          busy={running}
          onApprove={() => void handleApprove()}
          onCancel={handleCancel}
        />
      ) : null}
      {outcome ? (
        <p
          data-testid="cockpit-collect-result"
          role="status"
          className="flex flex-wrap items-center gap-2 text-sm text-hud-primary"
        >
          <span>{outcome.text}</span>
          {outcome.simulated ? (
            <span
              data-testid="cockpit-collect-simulated"
              className="rounded border border-hud-cyan/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80"
            >
              SIMULATED
            </span>
          ) : null}
        </p>
      ) : null}
      {rawError ? (
        <p
          data-testid="cockpit-collect-error"
          role="alert"
          title={rawError}
          className="font-mono text-[13px] text-hud-cyan/80"
        >
          {TYPED_TURN_ERROR_COPY}
        </p>
      ) : null}
    </div>
  );
}
