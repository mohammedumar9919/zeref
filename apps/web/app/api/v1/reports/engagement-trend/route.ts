import { NextResponse } from "next/server";

import { getEngagementTrend } from "@/lib/reports/engagement-trend-bff";

export const dynamic = "force-dynamic";

/** GET /api/v1/reports/engagement-trend — per-post engagement trend + own median (C6). */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await getEngagementTrend();
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "failed to load engagement trend" }, { status: 500 });
  }
}
