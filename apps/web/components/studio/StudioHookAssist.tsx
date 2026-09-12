"use client";

import { useCallback, useState } from "react";

import { suggestHooksFromReport, type EliteReportLike } from "../reports/report-view";

const FIXTURE_ARTIFACT_ID = "550e8400-e29b-41d4-a716-446655440000";

type StudioHookAssistProps = {
  snapshotCaption?: string;
  onApply: (hook: string) => void;
};

type AssistState = "idle" | "loading" | "ready" | "error";

export function StudioHookAssist({
  snapshotCaption,
  onApply,
}: StudioHookAssistProps): React.ReactElement {
  const [state, setState] = useState<AssistState>("idle");
  const [hooks, setHooks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadHooks = useCallback(async () => {
    setState("loading");
    setError(null);
    const local: string[] = [];
    if (snapshotCaption?.trim()) {
      local.push(snapshotCaption.trim());
    }

    try {
      const response = await fetch(`/api/v1/reports/artifacts/${FIXTURE_ARTIFACT_ID}`);
      if (!response.ok) {
        throw new Error(`report ${response.status}`);
      }
      const report = (await response.json()) as EliteReportLike;
      const fromReport = suggestHooksFromReport(report);
      const merged = [...local];
      for (const hook of fromReport) {
        if (!merged.includes(hook)) merged.push(hook);
      }
      setHooks(merged);
      setState("ready");
    } catch (err) {
      setHooks(local);
      setState(local.length > 0 ? "ready" : "error");
      setError(err instanceof Error ? err.message : "hook assist failed");
    }
  }, [snapshotCaption]);

  return (
    <div
      data-testid="studio-hook-assist"
      className="rounded border border-hud-border bg-hud-surface/20 px-4 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
          Caption / hook assist
        </p>
        <button
          type="button"
          data-testid="studio-hook-assist-load"
          className="cursor-pointer rounded border border-hud-cyan/50 bg-hud-cyan/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-hud-cyan transition-colors hover:bg-hud-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={state === "loading"}
          onClick={() => void loadHooks()}
        >
          {state === "loading" ? "Loading…" : "Suggest from report"}
        </button>
      </div>
      <p className="mt-1 text-xs text-hud-muted">
        Uses the existing elite artifact API — no new generation pipeline.
      </p>
      {error && state === "error" ? (
        <p className="mt-2 font-mono text-[10px] text-amber-200/90">{error}</p>
      ) : null}
      {hooks.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2" data-testid="studio-hook-assist-list">
          {hooks.map((hook) => (
            <li key={hook}>
              <button
                type="button"
                className="w-full cursor-pointer rounded border border-hud-border px-3 py-2 text-left text-sm text-hud-primary transition-colors hover:border-hud-cyan/40 hover:bg-hud-cyan/5"
                onClick={() => onApply(hook)}
              >
                {hook}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
