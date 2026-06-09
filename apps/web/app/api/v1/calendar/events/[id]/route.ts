import { NextResponse } from "next/server";

import { patchCalendarEvent } from "@/lib/calendar-bff";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PATCH /api/v1/calendar/events/:id — update calendar event. */
export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const result = await patchCalendarEvent(id, body);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "failed to update calendar event" }, { status: 500 });
  }
}
