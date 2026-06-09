import { NextResponse } from "next/server";

import { searchMemory } from "@zeref/zeref-memory";

export const dynamic = "force-dynamic";

/** GET /api/v1/memory/search?q= — read-only debug search (ADR-026). */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ error: "query parameter q is required" }, { status: 400 });
  }

  try {
    const result = await searchMemory(query);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[memory/search] failed:", error);
    return NextResponse.json({ error: "memory search failed" }, { status: 500 });
  }
}
