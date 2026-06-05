import { NextResponse } from "next/server";

import { getResearchTopic } from "@/lib/research-bff";

export const dynamic = "force-dynamic";

/** GET /api/v1/research/topics/:id — topic detail + signals (C84). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const result = await getResearchTopic(id);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "failed to load research topic" }, { status: 500 });
  }
}
