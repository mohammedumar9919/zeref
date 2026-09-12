export type CalendarContentSlot = {
  caption: string;
  mediaUrl: string;
  scheduledAt: string;
};

export type CalendarContentEvent = {
  scheduledAt: string;
  payload: Record<string, unknown>;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function readCalendarContentSlot(event: CalendarContentEvent): CalendarContentSlot {
  const payload = event.payload ?? {};
  return {
    caption: asString(payload.caption),
    mediaUrl: asString(payload.mediaUrl),
    scheduledAt: event.scheduledAt,
  };
}

/** Merge caption/media into payload without dropping job routing ids. */
export function mergeCalendarContentPayload(
  payload: Record<string, unknown>,
  slot: { caption: string; mediaUrl: string },
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...payload };
  if (slot.caption.trim()) {
    next.caption = slot.caption.trim();
  } else {
    delete next.caption;
  }
  if (slot.mediaUrl.trim()) {
    next.mediaUrl = slot.mediaUrl.trim();
  } else {
    delete next.mediaUrl;
  }
  return next;
}
