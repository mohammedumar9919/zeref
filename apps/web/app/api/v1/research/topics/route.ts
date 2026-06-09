import { NextResponse } from "next/server";

import { createResearchTopic, listResearchTopics } from "@/lib/research-bff";

export const dynamic = "force-dynamic";

/** GET /api/v1/research/topics — list research topics (C84). */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await listResearchTopics();
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "failed to list research topics" }, { status: 500 });
  }
}

/** POST /api/v1/research/topics — create topic seed (C85). */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const result = await createResearchTopic(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "failed to create research topic" }, { status: 500 });
  }
}
