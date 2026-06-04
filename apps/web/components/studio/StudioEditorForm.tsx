"use client";

import { useCallback, useState } from "react";

import type { StudioDraft } from "@zeref/contracts";

export type StudioEditorEntity = {
  entityId: string;
  snapshotId: string;
  title: string;
  payload: {
    shortcode: string;
    caption?: string;
  };
  draft: StudioDraft | null;
};

type StudioEditorFormProps = {
  entity: StudioEditorEntity;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function initialDraftFields(entity: StudioEditorEntity): {
  caption: string;
  notes: string;
  tags: string;
} {
  const draft = entity.draft;
  return {
    caption: draft?.caption ?? entity.payload.caption ?? "",
    notes: draft?.notes ?? "",
    tags: (draft?.tags ?? []).join(", "),
  };
}

export function StudioEditorForm({
  entity,
}: StudioEditorFormProps): React.ReactElement {
  const [fields, setFields] = useState(() => initialDraftFields(entity));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const saveDraft = useCallback(async () => {
    setSaveState("saving");
    setErrorMessage(null);

    const tags = fields.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const response = await fetch(`/api/v1/studio/drafts/${entity.entityId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caption: fields.caption,
          notes: fields.notes,
          tags,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `save failed (${response.status})`);
      }

      const saved = (await response.json()) as StudioDraft;
      setFields({
        caption: saved.caption,
        notes: saved.notes,
        tags: saved.tags.join(", "),
      });
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setErrorMessage(err instanceof Error ? err.message : "save failed");
    }
  }, [entity.entityId, fields.caption, fields.notes, fields.tags]);

  return (
    <div
      data-testid="studio-editor"
      className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 md:px-6"
    >
      <header className="space-y-2 border-b border-hud-border pb-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/90">
          Studio editor
        </p>
        <h1 className="text-lg font-medium text-hud-primary">{entity.title}</h1>
        <p className="font-mono text-[10px] text-hud-muted">
          snapshot {entity.snapshotId.slice(0, 8)}… · entity {entity.entityId.slice(0, 8)}…
        </p>
        <p className="font-mono text-[10px] text-hud-muted">
          shortcode {entity.payload.shortcode} — normalized payload read-only (C78)
        </p>
      </header>

      <div className="space-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
            Caption
          </span>
          <textarea
            data-testid="studio-editor-caption"
            className="min-h-[120px] rounded border border-hud-border bg-hud-panel/60 px-3 py-2 text-sm text-hud-primary outline-none ring-hud-cyan/30 focus:ring-1"
            value={fields.caption}
            onChange={(e) => {
              setSaveState("idle");
              setFields((prev) => ({ ...prev, caption: e.target.value }));
            }}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
            Notes
          </span>
          <textarea
            data-testid="studio-editor-notes"
            className="min-h-[80px] rounded border border-hud-border bg-hud-panel/60 px-3 py-2 text-sm text-hud-primary outline-none ring-hud-cyan/30 focus:ring-1"
            value={fields.notes}
            onChange={(e) => {
              setSaveState("idle");
              setFields((prev) => ({ ...prev, notes: e.target.value }));
            }}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
            Tags (comma-separated)
          </span>
          <input
            data-testid="studio-editor-tags"
            type="text"
            className="rounded border border-hud-border bg-hud-panel/60 px-3 py-2 text-sm text-hud-primary outline-none ring-hud-cyan/30 focus:ring-1"
            value={fields.tags}
            onChange={(e) => {
              setSaveState("idle");
              setFields((prev) => ({ ...prev, tags: e.target.value }));
            }}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="studio-editor-save"
          className="cursor-pointer rounded border border-hud-cyan/50 bg-hud-cyan/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-hud-cyan transition-colors hover:bg-hud-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={saveState === "saving"}
          onClick={() => void saveDraft()}
        >
          {saveState === "saving" ? "Saving…" : "Save draft"}
        </button>
        <span
          data-testid="studio-editor-status"
          className="font-mono text-[10px] text-hud-muted"
          aria-live="polite"
        >
          {saveState === "saved" ? "Draft saved." : null}
          {saveState === "error" && errorMessage ? errorMessage : null}
        </span>
      </div>

      <p className="font-mono text-[10px] text-hud-muted">
        <a href="/cockpit/studio" className="text-hud-cyan hover:underline">
          ← Back to studio panel
        </a>
      </p>
    </div>
  );
}
