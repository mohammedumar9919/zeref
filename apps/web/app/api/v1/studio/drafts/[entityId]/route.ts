import { NextResponse } from "next/server";

import { upsertStudioDraft } from "@/lib/studio-bff";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ entityId: string }>;
};

/** PUT /api/v1/studio/drafts/:entityId — upsert draft overlay only (C78). */
export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { entityId } = await context.params;

  try {
    const body = await request.json();
    const result = await upsertStudioDraft(entityId, body);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "failed to save studio draft" }, { status: 500 });
  }
}
