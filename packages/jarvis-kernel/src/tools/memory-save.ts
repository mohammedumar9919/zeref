import { isMemoryMockMode, saveMemory } from "@zeref/zeref-memory";
import type { ToolContext } from "../types.js";

export async function memorySave(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const turnId = typeof args.turnId === "string" ? args.turnId : ctx.turnId;

  const summaryText =
    typeof args.summaryText === "string" && args.summaryText.trim().length > 0
      ? args.summaryText.trim()
      : (ctx.transcript ?? "").trim();

  const saveResult = await saveMemory({
    content: summaryText,
    tier: "episodic",
    source: "voice",
    metadata: {
      ...(turnId ? { turnId } : {}),
      ...(typeof args.metadata === "object" && args.metadata !== null
        ? (args.metadata as Record<string, unknown>)
        : {}),
    },
  });

  const brainEvent = {
    type: "memory.saved",
    entryId: saveResult.entry.id,
    tier: saveResult.entry.tier,
    ts: saveResult.entry.createdAt,
    ...(turnId ? { turnId } : {}),
    ...(isMemoryMockMode() ? { simulated: true } : {}),
  };

  return { saveResult, brainEvent };
}

