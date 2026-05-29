import { and, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  CollectJobInput,
  CollectJobOutput,
  SnapshotId,
} from "@zeref/contracts";
import { snapshots, type schema } from "@zeref/db";

type Db = NodePgDatabase<typeof schema>;

export type InsertSnapshotInput = {
  platformAccountId?: string | null;
  platform: CollectJobInput["platform"];
  kind: CollectJobInput["kind"];
  sourceRef: string;
  contentHash: string;
  payloadJson: unknown;
  collectedAt: Date;
};

export async function findExistingSnapshot(
  db: Db,
  input: {
    platformAccountId?: string | null;
    platform: CollectJobInput["platform"];
    kind: CollectJobInput["kind"];
    contentHash: string;
  },
): Promise<CollectJobOutput | null> {
  const accountCondition =
    input.platformAccountId != null
      ? eq(snapshots.platformAccountId, input.platformAccountId)
      : isNull(snapshots.platformAccountId);

  const rows = await db
    .select({ id: snapshots.id, contentHash: snapshots.contentHash })
    .from(snapshots)
    .where(
      and(
        accountCondition,
        eq(snapshots.platform, input.platform),
        eq(snapshots.kind, input.kind),
        eq(snapshots.contentHash, input.contentHash),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    snapshotId: row.id as SnapshotId,
    contentHash: row.contentHash,
  };
}

export async function insertSnapshot(
  db: Db,
  input: InsertSnapshotInput,
): Promise<CollectJobOutput> {
  const rows = await db
    .insert(snapshots)
    .values({
      platformAccountId: input.platformAccountId ?? null,
      platform: input.platform,
      kind: input.kind,
      sourceRef: input.sourceRef,
      contentHash: input.contentHash,
      payloadJson: input.payloadJson,
      collectedAt: input.collectedAt,
    })
    .returning({ id: snapshots.id, contentHash: snapshots.contentHash });

  const row = rows[0];
  if (!row) {
    throw new Error("snapshot INSERT returned no row");
  }

  return {
    snapshotId: row.id as SnapshotId,
    contentHash: row.contentHash,
  };
}
