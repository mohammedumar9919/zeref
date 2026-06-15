"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

import type { CalendarEvent, CalendarEventStatus } from "@zeref/contracts";

import {
  UI_JOB_TYPES,
  buildEnqueueRequestFromEvent,
  fromDatetimeLocalValue,
  groupEventsByWeek,
  isDueForManualEnqueue,
  toDatetimeLocalValue,
  type CalendarUiJobType,
} from "./calendar-scheduler-utils";

type CalendarSchedulerProps = {
  initialEvents: CalendarEvent[];
};

type ViewMode = "list" | "week";

type FormMode = "create" | "edit";

type EventFormState = {
  title: string;
  scheduledAtLocal: string;
  jobType: CalendarUiJobType | "";
  entityId: string;
  snapshotId: string;
  topicId: string;
  status: CalendarEventStatus;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type EnqueueState = "idle" | "enqueueing" | "queued" | "error";

function defaultFormState(): EventFormState {
  const inOneHour = new Date(Date.now() + 3600_000);
  return {
    title: "",
    scheduledAtLocal: toDatetimeLocalValue(inOneHour.toISOString()),
    jobType: "",
    entityId: "",
    snapshotId: "",
    topicId: "",
    status: "scheduled",
  };
}

function formFromEvent(event: CalendarEvent): EventFormState {
  const payload = event.payload as Record<string, unknown>;
  const entityRaw = payload.normalizedEntityId ?? payload.entityId;
  const snapshotRaw = payload.snapshotId;
  const topicRaw = payload.topicId;
  return {
    title: event.title,
    scheduledAtLocal: toDatetimeLocalValue(event.scheduledAt),
    jobType: UI_JOB_TYPES.includes(event.jobType as CalendarUiJobType)
      ? (event.jobType as CalendarUiJobType)
      : "",
    entityId: typeof entityRaw === "string" ? entityRaw : "",
    snapshotId: typeof snapshotRaw === "string" ? snapshotRaw : "",
    topicId: typeof topicRaw === "string" ? topicRaw : "",
    status: event.status,
  };
}

function buildPayloadFromForm(form: EventFormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (form.entityId.trim()) {
    payload.normalizedEntityId = form.entityId.trim();
  }
  if (form.snapshotId.trim()) {
    payload.snapshotId = form.snapshotId.trim();
  }
  if (form.topicId.trim()) {
    payload.topicId = form.topicId.trim();
  }
  return payload;
}

function buildCreateBody(form: EventFormState): Record<string, unknown> {
  return {
    title: form.title.trim(),
    scheduledAt: fromDatetimeLocalValue(form.scheduledAtLocal),
    status: form.status,
    ...(form.jobType ? { jobType: form.jobType } : {}),
    ...(Object.keys(buildPayloadFromForm(form)).length > 0
      ? { payload: buildPayloadFromForm(form) }
      : {}),
  };
}

function buildPatchBody(form: EventFormState): Record<string, unknown> {
  const body: Record<string, unknown> = {
    title: form.title.trim(),
    scheduledAt: fromDatetimeLocalValue(form.scheduledAtLocal),
    status: form.status,
    payload: buildPayloadFromForm(form),
  };
  if (form.jobType) {
    body.jobType = form.jobType;
  } else {
    body.jobType = null;
  }
  return body;
}

export function CalendarScheduler({
  initialEvents,
}: CalendarSchedulerProps): React.ReactElement {
  const [events, setEvents] = useState(initialEvents);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultFormState);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [enqueueState, setEnqueueState] = useState<EnqueueState>("idle");
  const [workerWarning, setWorkerWarning] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const eventsSnapshotRef = useRef<CalendarEvent[] | null>(null);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId],
  );

  const weekGroups = useMemo(() => groupEventsByWeek(events), [events]);

  const resetCreateForm = useCallback(() => {
    setFormMode("create");
    setSelectedId(null);
    setForm(defaultFormState());
    setSaveState("idle");
    setSaveError(null);
  }, []);

  const selectEvent = useCallback((event: CalendarEvent) => {
    setFormMode("edit");
    setSelectedId(event.id);
    setForm(formFromEvent(event));
    setSaveState("idle");
    setSaveError(null);
  }, []);

  const refreshEvents = useCallback(async () => {
    const response = await fetch("/api/v1/calendar/events");
    if (!response.ok) {
      throw new Error(`list failed (${response.status})`);
    }
    const data = (await response.json()) as { events: CalendarEvent[] };
    setEvents(data.events);
  }, []);

  const buildOptimisticEvent = useCallback(
    (id: string): CalendarEvent => ({
      id,
      title: form.title.trim(),
      scheduledAt: fromDatetimeLocalValue(form.scheduledAtLocal),
      ...(form.jobType ? { jobType: form.jobType as CalendarEvent["jobType"] } : {}),
      payload: buildPayloadFromForm(form),
      status: form.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [form],
  );

  const saveEvent = useCallback(async () => {
    eventsSnapshotRef.current = null;

    try {
      if (formMode === "create") {
        const optimisticId = `optimistic-${Date.now()}`;
        setEvents((prev) => {
          eventsSnapshotRef.current = prev;
          return [buildOptimisticEvent(optimisticId), ...prev];
        });

        const response = await fetch("/api/v1/calendar/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(buildCreateBody(form)),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `create failed (${response.status})`);
        }
        const created = (await response.json()) as CalendarEvent;
        setEvents((prev) => [created, ...prev.filter((event) => event.id !== optimisticId)]);
        selectEvent(created);
      } else if (selectedId) {
        setEvents((prev) => {
          eventsSnapshotRef.current = prev;
          return prev.map((event) =>
            event.id === selectedId ? buildOptimisticEvent(selectedId) : event,
          );
        });

        const response = await fetch(`/api/v1/calendar/events/${selectedId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(buildPatchBody(form)),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `update failed (${response.status})`);
        }
        const updated = (await response.json()) as CalendarEvent;
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        setForm(formFromEvent(updated));
      }
      setSaveState("saved");
    } catch (err) {
      if (eventsSnapshotRef.current) {
        setEvents(eventsSnapshotRef.current);
        eventsSnapshotRef.current = null;
      }
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "save failed");
    }
  }, [buildOptimisticEvent, form, formMode, selectEvent, selectedId]);

  const runManualEnqueue = useCallback(
    async (event: CalendarEvent) => {
      const body = buildEnqueueRequestFromEvent(event);
      if (!body) {
        setEnqueueState("error");
        setWorkerWarning("Event missing allowlisted job type or required ids for enqueue.");
        return;
      }

      try {
        const response = await fetch("/api/v1/jobs/enqueue", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = (await response.json()) as {
          jobId?: string;
          workerConsuming?: boolean;
          error?: string;
          mocked?: boolean;
        };

        if (!response.ok) {
          throw new Error(data.error ?? `enqueue failed (${response.status})`);
        }

        setLastJobId(data.jobId ?? null);
        setEnqueueState("queued");

        if (data.workerConsuming === false) {
          setWorkerWarning(
            data.mocked
              ? "Job queued (mock). Worker daemon not consuming — start worker to process queue."
              : "Job queued but worker daemon not consuming (ZEREF_WORKER_AVAILABLE unset).",
          );
        }
      } catch (err) {
        setEnqueueState("error");
        setWorkerWarning(err instanceof Error ? err.message : "enqueue failed");
      }
    },
    [],
  );

  const canEnqueueSelected =
    selectedEvent !== null &&
    selectedEvent.status !== "cancelled" &&
    selectedEvent.status !== "completed" &&
    isDueForManualEnqueue(selectedEvent.scheduledAt) &&
    buildEnqueueRequestFromEvent(selectedEvent) !== null;

  return (
    <section
      data-testid="calendar-scheduler"
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 border-t border-hud-border px-4 py-8 md:px-6"
    >
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/90">
              Calendar scheduler
            </p>
            <h2 className="text-lg font-medium text-hud-primary">Pipeline schedule</h2>
            <p className="text-sm text-hud-muted">
              Week/list view · create and edit events · manual run when due (Q5 MVP)
            </p>
          </div>
          <span
            data-testid="scheduler-absent-badge"
            className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-200/90"
            title="Phase 8.1 will add cron scheduler daemon"
          >
            Scheduler daemon absent — manual enqueue only
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="calendar-view-list"
            className={`cursor-pointer rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
              viewMode === "list"
                ? "border-hud-cyan/50 bg-hud-cyan/15 text-hud-cyan"
                : "border-hud-border text-hud-muted hover:border-hud-cyan/30"
            }`}
            onClick={() => setViewMode("list")}
          >
            List
          </button>
          <button
            type="button"
            data-testid="calendar-view-week"
            className={`cursor-pointer rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
              viewMode === "week"
                ? "border-hud-cyan/50 bg-hud-cyan/15 text-hud-cyan"
                : "border-hud-border text-hud-muted hover:border-hud-cyan/30"
            }`}
            onClick={() => setViewMode("week")}
          >
            Week
          </button>
          <button
            type="button"
            data-testid="calendar-event-new"
            className="cursor-pointer rounded border border-hud-cyan/50 bg-hud-cyan/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-hud-cyan transition-colors hover:bg-hud-cyan/20"
            onClick={resetCreateForm}
          >
            New event
          </button>
        </div>
      </header>

      {workerWarning ? (
        <p
          data-testid="calendar-enqueue-worker-warning"
          className="rounded border border-amber-400/40 bg-amber-400/10 px-3 py-2 font-mono text-[10px] text-amber-200/90"
          role="status"
        >
          {workerWarning}
          {lastJobId ? ` · job ${lastJobId.slice(0, 8)}…` : null}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div
          data-testid="calendar-event-list"
          className="max-h-[420px] space-y-4 overflow-y-auto rounded border border-hud-border bg-hud-panel/40 p-3"
        >
          {events.length === 0 ? (
            <p className="text-sm text-hud-muted">No calendar events — create one to schedule work.</p>
          ) : viewMode === "list" ? (
            <ul className="space-y-2">
              {events.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    data-testid={`calendar-event-row-${event.id}`}
                    className={`w-full cursor-pointer rounded border px-3 py-2 text-left transition-colors ${
                      selectedId === event.id
                        ? "border-hud-cyan/50 bg-hud-cyan/10"
                        : "border-hud-border/60 hover:border-hud-cyan/30"
                    }`}
                    onClick={() => selectEvent(event)}
                  >
                    <span className="text-sm text-hud-primary">{event.title}</span>
                    <p className="font-mono text-[10px] text-hud-muted">
                      {new Date(event.scheduledAt).toLocaleString()} · {event.status}
                      {event.jobType ? ` · ${event.jobType}` : ""}
                    </p>
                    {isDueForManualEnqueue(event.scheduledAt) && event.jobType ? (
                      <p className="font-mono text-[10px] text-amber-200/80">due — manual run available</p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            [...weekGroups.entries()].map(([week, bucket]) => (
              <div key={week} className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
                  {week}
                </p>
                <ul className="space-y-2">
                  {bucket.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        className={`w-full cursor-pointer rounded border px-3 py-2 text-left transition-colors ${
                          selectedId === event.id
                            ? "border-hud-cyan/50 bg-hud-cyan/10"
                            : "border-hud-border/60 hover:border-hud-cyan/30"
                        }`}
                        onClick={() => selectEvent(event)}
                      >
                        <span className="text-sm text-hud-primary">{event.title}</span>
                        <p className="font-mono text-[10px] text-hud-muted">
                          {new Date(event.scheduledAt).toLocaleString()}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <form
          data-testid="calendar-event-form"
          className="flex flex-col gap-4 rounded border border-hud-border bg-hud-panel/50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSaveState("saving");
            setSaveError(null);
            void saveEvent();
          }}
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
            {formMode === "create" ? "Create event" : "Edit event"}
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
              Title
            </span>
            <input
              data-testid="calendar-form-title"
              type="text"
              required
              className="rounded border border-hud-border bg-hud-panel/60 px-3 py-2 text-sm text-hud-primary outline-none ring-hud-cyan/30 focus:ring-1"
              value={form.title}
              onChange={(e) => {
                setSaveState("idle");
                setForm((prev) => ({ ...prev, title: e.target.value }));
              }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
              Scheduled at
            </span>
            <input
              data-testid="calendar-form-scheduled-at"
              type="datetime-local"
              required
              className="rounded border border-hud-border bg-hud-panel/60 px-3 py-2 font-mono text-sm text-hud-primary outline-none ring-hud-cyan/30 focus:ring-1"
              value={form.scheduledAtLocal}
              onChange={(e) => {
                setSaveState("idle");
                setForm((prev) => ({ ...prev, scheduledAtLocal: e.target.value }));
              }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
              Job type (allowlisted — no collect)
            </span>
            <select
              data-testid="calendar-form-job-type"
              className="cursor-pointer rounded border border-hud-border bg-hud-panel/60 px-3 py-2 font-mono text-sm text-hud-primary outline-none ring-hud-cyan/30 focus:ring-1"
              value={form.jobType}
              onChange={(e) => {
                setSaveState("idle");
                setForm((prev) => ({
                  ...prev,
                  jobType: e.target.value as CalendarUiJobType | "",
                }));
              }}
            >
              <option value="">None</option>
              {UI_JOB_TYPES.map((jt) => (
                <option key={jt} value={jt}>
                  {jt}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
              Entity ID (embed / analyze / report)
            </span>
            <input
              data-testid="calendar-form-entity-id"
              type="text"
              className="rounded border border-hud-border bg-hud-panel/60 px-3 py-2 font-mono text-xs text-hud-primary outline-none ring-hud-cyan/30 focus:ring-1"
              value={form.entityId}
              onChange={(e) => {
                setSaveState("idle");
                setForm((prev) => ({ ...prev, entityId: e.target.value }));
              }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
              Snapshot ID (normalize / analyze / report)
            </span>
            <input
              data-testid="calendar-form-snapshot-id"
              type="text"
              className="rounded border border-hud-border bg-hud-panel/60 px-3 py-2 font-mono text-xs text-hud-primary outline-none ring-hud-cyan/30 focus:ring-1"
              value={form.snapshotId}
              onChange={(e) => {
                setSaveState("idle");
                setForm((prev) => ({ ...prev, snapshotId: e.target.value }));
              }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
              Topic ID (research)
            </span>
            <input
              data-testid="calendar-form-topic-id"
              type="text"
              className="rounded border border-hud-border bg-hud-panel/60 px-3 py-2 font-mono text-xs text-hud-primary outline-none ring-hud-cyan/30 focus:ring-1"
              value={form.topicId}
              onChange={(e) => {
                setSaveState("idle");
                setForm((prev) => ({ ...prev, topicId: e.target.value }));
              }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
              Status
            </span>
            <select
              data-testid="calendar-form-status"
              className="cursor-pointer rounded border border-hud-border bg-hud-panel/60 px-3 py-2 font-mono text-sm text-hud-primary outline-none ring-hud-cyan/30 focus:ring-1"
              value={form.status}
              onChange={(e) => {
                setSaveState("idle");
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as CalendarEventStatus,
                }));
              }}
            >
              <option value="draft">draft</option>
              <option value="scheduled">scheduled</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              data-testid="calendar-form-save"
              className="cursor-pointer rounded border border-hud-cyan/50 bg-hud-cyan/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-hud-cyan transition-colors hover:bg-hud-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saveState === "saving"}
            >
              {saveState === "saving" ? "Saving…" : formMode === "create" ? "Create" : "Save"}
            </button>

            {formMode === "edit" && selectedEvent ? (
              <button
                type="button"
                data-testid="calendar-form-enqueue"
                className="cursor-pointer rounded border border-amber-400/50 bg-amber-400/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-amber-200/90 transition-colors hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canEnqueueSelected || enqueueState === "enqueueing"}
                onClick={() => {
                  setEnqueueState("enqueueing");
                  setWorkerWarning(null);
                  setLastJobId(null);
                  void runManualEnqueue(selectedEvent);
                }}
              >
                {enqueueState === "enqueueing" ? "Enqueueing…" : "Run job now"}
              </button>
            ) : null}

            <span
              data-testid="calendar-form-status-message"
              className="font-mono text-[10px] text-hud-muted"
              aria-live="polite"
            >
              {saveState === "saved" ? "Saved." : null}
              {saveState === "error" && saveError ? saveError : null}
              {enqueueState === "queued" && !workerWarning ? "Job queued." : null}
            </span>
          </div>
        </form>
      </div>

      <p className="font-mono text-[10px] text-hud-muted">
        <button
          type="button"
          className="cursor-pointer text-hud-cyan hover:underline"
          onClick={() => void refreshEvents().catch(() => undefined)}
        >
          Refresh list
        </button>
        {" · "}
        <Link href="/cockpit" className="text-hud-cyan hover:underline">
          ← Cockpit
        </Link>
      </p>
    </section>
  );
}
