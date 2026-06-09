import { isMemoryMockMode, searchMemory } from "@zeref/zeref-memory";
import type { ToolContext } from "../types.js";

export async function memorySearch(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const query =
    typeof args.query === "string" && args.query.trim().length > 0
      ? args.query.trim()
      : (ctx.transcript ?? "").trim();

  const turnId = typeof args.turnId === "string" ? args.turnId : ctx.turnId;

  const searchResult = await searchMemory(query);
  const ts = searchResult.ts;

  const brainEvent = {
    type: "memory.search",
    query,
    resultCount: searchResult.totalCount,
    ts,
    ...(turnId ? { turnId } : {}),
    ...(isMemoryMockMode() ? { simulated: true } : {}),
  };

  return { searchResult, brainEvent };
}

