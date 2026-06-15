import type { ZerefWriteContext } from "../context.js";

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
