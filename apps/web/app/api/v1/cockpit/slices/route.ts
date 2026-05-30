import { NextResponse } from "next/server";

import { loadCockpitSlices } from "@/lib/cockpit-bff";

export const dynamic = "force-dynamic";

/** GET /api/v1/cockpit/slices — panel summary DTOs for RSC pages. */
export async function GET(): Promise<NextResponse> {
  try {
    const slices = await loadCockpitSlices();
    return NextResponse.json(slices);
  } catch {
    return NextResponse.json({ error: "failed to load cockpit slices" }, { status: 500 });
  }
}
