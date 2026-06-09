import { NextResponse } from "next/server";

import { createCalendarEvent, listCalendarEvents } from "@/lib/calendar-bff";

export const dynamic = "force-dynamic";

/** GET /api/v1/calendar/events — list calendar events. */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await listCalendarEvents();
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "failed to list calendar events" }, { status: 500 });
  }
}

/** POST /api/v1/calendar/events — create calendar event. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const result = await createCalendarEvent(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "failed to create calendar event" }, { status: 500 });
  }
}
