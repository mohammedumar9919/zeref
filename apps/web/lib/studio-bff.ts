import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  NormalizedEntityIdSchema,
  NormalizedPostPayloadSchema,
  StudioDraftSchema,
  type StudioDraft,
} from "@zeref/contracts";
import { normalizedEntities, studioDrafts } from "@zeref/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, isFixtureMode } from "./db";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const phase8FixturesRoot = join(repoRoot, "fixtures/phase-8");

export const StudioEntityDetailSchema = z
  .object({
    entityId: NormalizedEntityIdSchema,
    snapshotId: z.string().uuid(),
    title: z.string().min(1),
    payload: NormalizedPostPayloadSchema,
    draft: StudioDraftSchema.nullable(),
  })
  .strict();

export type StudioEntityDetail = z.infer<typeof StudioEntityDetailSchema>;

export const StudioDraftUpsertSchema = z
  .object({
    caption: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict();

export type BffResult<T> =
  | { status: 200; body: T }
  | { status: 404; body: { error: string } }
  | { status: 400; body: { error: string } }
  | { status: 500; body: { error: string } };

function loadPhase8Fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(phase8FixturesRoot, name), "utf8"));
}

function studioTitle(payloadJson: unknown): string {
  const parsed = NormalizedPostPayloadSchema.safeParse(payloadJson);
  if (parsed.success) {
    if (parsed.data.caption?.trim()) {
      const trimmed = parsed.data.caption.trim();
      return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
    }
    return parsed.data.shortcode;
  }

  if (payloadJson && typeof payloadJson === "object" && "shortcode" in payloadJson) {
    const shortcode = (payloadJson as { shortcode?: unknown }).shortcode;
    if (typeof shortcode === "string" && shortcode.length > 0) {
      return shortcode;
    }
  }

  return "Normalized entity";
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

const fixtureEntityPayload = {
  shortcode: "LOG240",
  caption: "Ride log fixture caption",
  sources: ["graph"],
  schemaVersion: "4.0.0",
};

let fixtureDrafts = new Map<string, StudioDraft>();

function ensureFixtureDrafts(): void {
  if (fixtureDrafts.size > 0) {
    return;
  }
  const seed = StudioDraftSchema.parse(loadPhase8Fixture("studio-draft.valid.json"));
  fixtureDrafts.set(seed.entityId, seed);
}

function getFixtureEntityDetail(entityId: string): BffResult<StudioEntityDetail> {
  ensureFixtureDrafts();
  const parsedId = NormalizedEntityIdSchema.safeParse(entityId);
  if (!parsedId.success) {
    return { status: 404, body: { error: "studio entity not found" } };
  }

  const seed = StudioDraftSchema.parse(loadPhase8Fixture("studio-draft.valid.json"));
  if (parsedId.data !== seed.entityId) {
    return { status: 404, body: { error: "studio entity not found" } };
  }

  const draft = fixtureDrafts.get(parsedId.data) ?? null;
  const detail = StudioEntityDetailSchema.parse({
    entityId: parsedId.data,
    snapshotId: "550e8400-e29b-41d4-a716-446655440002",
    title: studioTitle(fixtureEntityPayload),
    payload: fixtureEntityPayload,
    draft,
  });

  return { status: 200, body: detail };
}

async function getStudioEntityFromDb(entityId: string): Promise<BffResult<StudioEntityDetail>> {
  const parsedId = NormalizedEntityIdSchema.safeParse(entityId);
  if (!parsedId.success) {
    return { status: 404, body: { error: "studio entity not found" } };
  }

  const db = getDb();
  if (!db) {
    return { status: 500, body: { error: "database not configured" } };
  }

  const entityRows = await db
    .select({
      id: normalizedEntities.id,
      snapshotId: normalizedEntities.snapshotId,
      payloadJson: normalizedEntities.payloadJson,
    })
    .from(normalizedEntities)
    .where(eq(normalizedEntities.id, parsedId.data))
    .limit(1);

  const entity = entityRows[0];
  if (!entity) {
    return { status: 404, body: { error: "studio entity not found" } };
  }

  const draftRows = await db
    .select({
      entityId: studioDrafts.entityId,
      caption: studioDrafts.caption,
      notes: studioDrafts.notes,
      tagsJson: studioDrafts.tagsJson,
      updatedAt: studioDrafts.updatedAt,
    })
    .from(studioDrafts)
    .where(eq(studioDrafts.entityId, parsedId.data))
    .limit(1);

  const draftRow = draftRows[0];
  const draft = draftRow
    ? StudioDraftSchema.parse({
        entityId: draftRow.entityId,
        caption: draftRow.caption,
        notes: draftRow.notes,
        tags: draftRow.tagsJson ?? [],
        updatedAt: toIsoString(draftRow.updatedAt),
      })
    : null;

  try {
    const payload = NormalizedPostPayloadSchema.parse(entity.payloadJson);
    const detail = StudioEntityDetailSchema.parse({
      entityId: entity.id,
      snapshotId: entity.snapshotId,
      title: studioTitle(payload),
      payload,
      draft,
    });
    return { status: 200, body: detail };
  } catch {
    return { status: 500, body: { error: "invalid normalized entity payload" } };
  }
}

/** GET studio entity — normalized summary + optional draft overlay (ADR-028). */
export async function getStudioEntity(entityId: string): Promise<BffResult<StudioEntityDetail>> {
  if (isFixtureMode()) {
    return getFixtureEntityDetail(entityId);
  }

  return getStudioEntityFromDb(entityId);
}

async function upsertStudioDraftInDb(
  entityId: string,
  body: z.infer<typeof StudioDraftUpsertSchema>,
): Promise<BffResult<StudioDraft>> {
  const parsedId = NormalizedEntityIdSchema.safeParse(entityId);
  if (!parsedId.success) {
    return { status: 404, body: { error: "studio entity not found" } };
  }

  const db = getDb();
  if (!db) {
    return { status: 500, body: { error: "database not configured" } };
  }

  const entityRows = await db
    .select({ id: normalizedEntities.id })
    .from(normalizedEntities)
    .where(eq(normalizedEntities.id, parsedId.data))
    .limit(1);

  if (!entityRows[0]) {
    return { status: 404, body: { error: "studio entity not found" } };
  }

  const now = new Date();
  const caption = body.caption ?? "";
  const notes = body.notes ?? "";
  const tags = body.tags ?? [];

  await db
    .insert(studioDrafts)
    .values({
      entityId: parsedId.data,
      caption,
      notes,
      tagsJson: tags,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: studioDrafts.entityId,
      set: {
        caption,
        notes,
        tagsJson: tags,
        updatedAt: now,
      },
    });

  const draft = StudioDraftSchema.parse({
    entityId: parsedId.data,
    caption,
    notes,
    tags,
    updatedAt: toIsoString(now),
  });

  return { status: 200, body: draft };
}

function upsertStudioDraftFixture(
  entityId: string,
  body: z.infer<typeof StudioDraftUpsertSchema>,
): BffResult<StudioDraft> {
  const existing = getFixtureEntityDetail(entityId);
  if (existing.status !== 200) {
    return existing.status === 404
      ? { status: 404, body: { error: "studio entity not found" } }
      : { status: 500, body: { error: "failed to load studio entity" } };
  }

  ensureFixtureDrafts();
  const now = new Date().toISOString();
  const prior = fixtureDrafts.get(entityId);
  const draft = StudioDraftSchema.parse({
    entityId,
    caption: body.caption ?? prior?.caption ?? "",
    notes: body.notes ?? prior?.notes ?? "",
    tags: body.tags ?? prior?.tags ?? [],
    updatedAt: now,
  });
  fixtureDrafts.set(entityId, draft);
  return { status: 200, body: draft };
}

/** PUT studio draft — upsert overlay only; never mutates snapshots (C78). */
export async function upsertStudioDraft(
  entityId: string,
  rawBody: unknown,
): Promise<BffResult<StudioDraft>> {
  const parsedBody = StudioDraftUpsertSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return { status: 400, body: { error: "invalid studio draft body" } };
  }

  if (isFixtureMode()) {
    return upsertStudioDraftFixture(entityId, parsedBody.data);
  }

  return upsertStudioDraftInDb(entityId, parsedBody.data);
}

/** Test hook — resets in-memory fixture drafts. */
export function resetStudioFixtureStateForTests(): void {
  fixtureDrafts = new Map();
}
