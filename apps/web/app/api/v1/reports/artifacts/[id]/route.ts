import { NextResponse } from "next/server";

import { getReportArtifact } from "@/lib/cockpit-bff";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET /api/v1/reports/artifacts/:id — Zod-validated elite report JSON. */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const result = await getReportArtifact(id);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "failed to load report artifact" }, { status: 500 });
  }
}
