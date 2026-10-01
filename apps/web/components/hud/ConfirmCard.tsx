"use client";

import type { TypedPendingConfirm } from "@/lib/jarvis/typed-turn";

type ConfirmCardProps = {
  pending: TypedPendingConfirm;
  onApprove: () => void;
  onCancel: () => void;
  busy: boolean;
  /** Human label for the tool; falls back to the raw tool name. */
  label?: string;
};

const ARGS_SUMMARY_MAX = 96;

function formatArgValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "—";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function summarizeConfirmArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args ?? {});
  if (entries.length === 0) return "no arguments";
  const summary = entries
    .map(([key, value]) => `${key}: ${formatArgValue(value)}`)
    .join(" · ");
  return summary.length > ARGS_SUMMARY_MAX
    ? `${summary.slice(0, ARGS_SUMMARY_MAX - 1)}…`
    : summary;
}

/** Shared write-high approval card — nothing executes without the Confirm click. */
export function ConfirmCard({
  pending,
  onApprove,
  onCancel,
  busy,
  label,
}: ConfirmCardProps): React.ReactElement {
  const title = label?.trim() ? label : pending.toolName;

  return (
    <div
      data-testid="confirm-card"
      data-tool-name={pending.toolName}
      role="alertdialog"
      aria-label={`Confirm ${title}`}
      className="rounded-panel border border-hud-cyan/50 bg-panel/90 p-3 shadow-hud-glow"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-hud-cyan/80">
        Approval required
      </p>
      <p className="mt-1 text-[15px] font-medium text-hud-primary">{title}</p>
      <p
        data-testid="confirm-card-args"
        className="mt-0.5 break-words font-mono text-[13px] text-hud-muted"
      >
        {summarizeConfirmArgs(pending.args)}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          data-testid="confirm-card-approve"
          onClick={onApprove}
          disabled={busy}
          className="rounded border border-hud-cyan/60 bg-hud-cyan/15 px-4 py-1.5 font-mono text-[13px] uppercase tracking-widest text-hud-cyan transition-colors hover:bg-hud-cyan/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Running…" : "Confirm"}
        </button>
        <button
          type="button"
          data-testid="confirm-card-cancel"
          onClick={onCancel}
          disabled={busy}
          className="rounded border border-hud-border px-4 py-1.5 font-mono text-[13px] uppercase tracking-widest text-hud-muted transition-colors hover:text-hud-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
