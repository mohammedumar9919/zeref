import { NextResponse } from "next/server";

import { getStudioEntity } from "@/lib/studio-bff";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET /api/v1/studio/entities/:id — normalized summary + draft overlay. */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const result = await getStudioEntity(id);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "failed to load studio entity" }, { status: 500 });
  }
}
