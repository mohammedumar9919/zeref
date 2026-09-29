import { VaultKindSchema } from "@zeref/contracts";
import type { VaultPort } from "../../core/ports/memory-port.js";
import type { ZerefReadContext, ZerefWriteContext } from "../context.js";

export type IdempotencyCache = Map<string, unknown>;

function cacheKey(toolName: string, idempotencyKey: string): string {
  return `${toolName}:${idempotencyKey}`;
}

function readIdempotencyKey(args: Record<string, unknown>): string | undefined {
  const key = args.idempotencyKey;
  return typeof key === "string" && key.trim().length > 0 ? key.trim() : undefined;
}

function stripIdempotencyKey(args: Record<string, unknown>): Record<string, unknown> {
  const { idempotencyKey: _ignored, ...rest } = args;
  return rest;
}

/** Guarded job enqueue with idempotency (C154). */
export async function writeEnqueueJob(
  ctx: ZerefWriteContext,
  args: Record<string, unknown>,
  cache?: IdempotencyCache,
): Promise<unknown> {
  const idempotencyKey = readIdempotencyKey(args);
  if (idempotencyKey && cache?.has(cacheKey("enqueue_job", idempotencyKey))) {
    return cache.get(cacheKey("enqueue_job", idempotencyKey));
  }

  const result = await ctx.enqueueJob(stripIdempotencyKey(args), idempotencyKey);
  if (idempotencyKey && cache) {
    cache.set(cacheKey("enqueue_job", idempotencyKey), result);
  }
  return result;
}

/** Guarded calendar event create (C154). */
export async function writeCreateCalendarEvent(
  ctx: ZerefWriteContext,
  args: Record<string, unknown>,
  cache?: IdempotencyCache,
): Promise<unknown> {
  const idempotencyKey = readIdempotencyKey(args);
  if (idempotencyKey && cache?.has(cacheKey("create_calendar_event", idempotencyKey))) {
    return cache.get(cacheKey("create_calendar_event", idempotencyKey));
  }

  const result = await ctx.createCalendarEvent(stripIdempotencyKey(args), idempotencyKey);
  if (idempotencyKey && cache) {
    cache.set(cacheKey("create_calendar_event", idempotencyKey), result);
  }
  return result;
}

/** Guarded studio draft upsert (C154). */
export async function writeUpdateStudioDraft(
  ctx: ZerefWriteContext,
  args: Record<string, unknown>,
  cache?: IdempotencyCache,
): Promise<unknown> {
  const entityId = args.entityId;
  if (typeof entityId !== "string" || entityId.trim().length === 0) {
    throw new Error("entityId is required for update_studio_draft");
  }

  const idempotencyKey = readIdempotencyKey(args);
  if (idempotencyKey && cache?.has(cacheKey("update_studio_draft", idempotencyKey))) {
    return cache.get(cacheKey("update_studio_draft", idempotencyKey));
  }

  const { entityId: _e, idempotencyKey: _k, ...body } = args;
  const result = await ctx.updateStudioDraft(entityId, body, idempotencyKey);
  if (idempotencyKey && cache) {
    cache.set(cacheKey("update_studio_draft", idempotencyKey), result);
  }
  return result;
}

/** Guarded research topic create (C154). */
export async function writeCreateResearchTopic(
  ctx: ZerefWriteContext,
  args: Record<string, unknown>,
  cache?: IdempotencyCache,
): Promise<unknown> {
  const idempotencyKey = readIdempotencyKey(args);
  if (idempotencyKey && cache?.has(cacheKey("create_research_topic", idempotencyKey))) {
    return cache.get(cacheKey("create_research_topic", idempotencyKey));
  }

  const result = await ctx.createResearchTopic(stripIdempotencyKey(args), idempotencyKey);
  if (idempotencyKey && cache) {
    cache.set(cacheKey("create_research_topic", idempotencyKey), result);
  }
  return result;
}

/** External multi-platform trend research (web-intel). */
export async function writeResearchExternalTrends(
  ctx: ZerefWriteContext,
  args: Record<string, unknown>,
  cache?: IdempotencyCache,
): Promise<unknown> {
  const idempotencyKey = readIdempotencyKey(args);
  if (idempotencyKey && cache?.has(cacheKey("research_external_trends", idempotencyKey))) {
    return cache.get(cacheKey("research_external_trends", idempotencyKey));
  }

  const result = await ctx.researchExternalTrends(stripIdempotencyKey(args));
  if (idempotencyKey && cache) {
    cache.set(cacheKey("research_external_trends", idempotencyKey), result);
  }
  return result;
}

/** Reel-idea briefs (web-intel + optional Business Discovery). */
export async function writeSuggestReelIdeas(
  ctx: ZerefWriteContext,
  args: Record<string, unknown>,
  cache?: IdempotencyCache,
): Promise<unknown> {
  const idempotencyKey = readIdempotencyKey(args);
  if (idempotencyKey && cache?.has(cacheKey("suggest_reel_ideas", idempotencyKey))) {
    return cache.get(cacheKey("suggest_reel_ideas", idempotencyKey));
  }

  const result = await ctx.suggestReelIdeas(stripIdempotencyKey(args));
  if (idempotencyKey && cache) {
    cache.set(cacheKey("suggest_reel_ideas", idempotencyKey), result);
  }
  return result;
}

/** Episodic memory save (write-low; persistence still flows through the read context's MemoryPort). */
export async function writeMemorySave(
  ctx: Pick<ZerefReadContext, "canRead" | "unavailableMessage" | "memorySave">,
  content: string,
  opts?: { turnId?: string; tags?: string[] },
): Promise<unknown> {
  if (!ctx.canRead()) {
    return { available: false, message: ctx.unavailableMessage("memory_save") };
  }
  return ctx.memorySave(content, opts);
}

/** Pin an explicit operator instruction into the memory vault (CLOUD-C3). */
export async function writeVaultPin(
  vault: VaultPort,
  args: Record<string, unknown>,
): Promise<unknown> {
  const raw =
    typeof args.content === "string"
      ? args.content
      : typeof args.text === "string"
        ? args.text
        : "";
  const content = raw.trim();
  if (!content) {
    throw new Error("content is required for vault_pin");
  }
  const kind = VaultKindSchema.safeParse(args.kind);
  const turnId = typeof args.turnId === "string" && args.turnId ? args.turnId : undefined;
  const item = await vault.saveVaultItem({
    kind: kind.success ? kind.data : "pin",
    content,
    ...(turnId ? { sourceTurnId: turnId } : {}),
  });
  return { available: true, item };
}

/**
 * Hard-delete one vault item (write-high, confirm-gated by the loop).
 * Target: `id`, else a case-insensitive `content` match, else the most recent item.
 * A `content` that matches nothing deletes nothing.
 */
export async function writeVaultForget(
  vault: VaultPort,
  args: Record<string, unknown>,
): Promise<unknown> {
  const explicitId =
    typeof args.id === "string" && args.id.trim()
      ? args.id.trim()
      : typeof args.itemId === "string" && args.itemId.trim()
        ? args.itemId.trim()
        : undefined;

  let targetId = explicitId;
  if (!targetId) {
    const needle =
      typeof args.content === "string" && args.content.trim()
        ? args.content.trim().toLowerCase()
        : undefined;
    const items = await vault.listVaultItems({ limit: 200 });
    const match = needle
      ? items.find((item) => item.content.toLowerCase().includes(needle))
      : items[0];
    targetId = match?.id;
  }

  if (!targetId) {
    return { available: true, deleted: false, message: "no vault item matched" };
  }
  const result = await vault.forgetVaultItem(targetId);
  return { available: true, deleted: result.deleted, id: targetId };
}

/** Queue a fresh performance report (write-low voice path). */
export async function writeRequestPerformanceReport(
  ctx: ZerefWriteContext,
  args: Record<string, unknown>,
  cache?: IdempotencyCache,
): Promise<unknown> {
  const idempotencyKey = readIdempotencyKey(args);
  if (idempotencyKey && cache?.has(cacheKey("request_performance_report", idempotencyKey))) {
    return cache.get(cacheKey("request_performance_report", idempotencyKey));
  }

  const result = await ctx.requestPerformanceReport(stripIdempotencyKey(args));
  if (idempotencyKey && cache) {
    cache.set(cacheKey("request_performance_report", idempotencyKey), result);
  }
  return result;
}
