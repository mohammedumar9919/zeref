import type { MemoryEntry } from "@zeref/contracts";
import type { MemoryHistoryEntry, MemoryLifecyclePort } from "../../core/ports/memory-port.js";

export const STALE_DEFAULT_DAYS = 90;
export const STALE_DEFAULT_LIMIT = 20;
const STALE_MAX_DAYS = 3650;
const STALE_MAX_LIMIT = 50;
const ARCHIVE_MAX_IDS = 50;
const CONFIRM_LIST_MAX = 5;

type MemoryVersionStatus = "current" | "superseded" | "archived";

function str(args: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function intArg(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function isCurrent(entry: MemoryHistoryEntry): boolean {
  return entry.supersededBy === null && entry.archivedAt === null;
}

function statusOf(entry: MemoryHistoryEntry): MemoryVersionStatus {
  if (entry.archivedAt) return "archived";
  if (entry.supersededBy) return "superseded";
  return "current";
}

async function lifecycleEntry(
  port: MemoryLifecyclePort,
  id: string,
): Promise<MemoryHistoryEntry | undefined> {
  return (await port.getEntryHistory(id)).find((entry) => entry.id === id);
}

/** Archive ids from args: unique non-empty strings, capped. Never "all". */
export function readArchiveIds(args: Record<string, unknown>): string[] {
  if (!Array.isArray(args.ids)) return [];
  const ids = args.ids
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim());
  return [...new Set(ids)].slice(0, ARCHIVE_MAX_IDS);
}

/**
 * Which memory entry a lifecycle tool targets: `id`, else a case-insensitive
 * content match (search results first, then vault items), else — only when
 * `fallbackToLatestPin` — the most recent pin. `current` skips superseded or
 * archived entries. A needle that matches nothing resolves to nothing.
 */
export async function resolveMemoryTarget(
  port: MemoryLifecyclePort,
  opts: { id?: string; needle?: string; current: boolean; fallbackToLatestPin: boolean },
): Promise<MemoryHistoryEntry | undefined> {
  const accept = (entry: MemoryHistoryEntry | undefined) =>
    entry && (!opts.current || isCurrent(entry)) ? entry : undefined;

  if (opts.id) return accept(await lifecycleEntry(port, opts.id));

  if (opts.needle) {
    const needle = opts.needle.toLowerCase();
    const searched = await port.searchEntries(opts.needle, { limit: 20 });
    const vault = await port.listVaultItems({ limit: 200 });
    const candidates = [
      ...searched.map((entry) => entry.id),
      ...vault.map((item) => item.id),
    ].filter((id, index, all) => all.indexOf(id) === index);
    const contentById = new Map<string, string>([
      ...searched.map((entry) => [entry.id, entry.content] as const),
      ...vault.map((item) => [item.id, item.content] as const),
    ]);
    for (const id of candidates) {
      if (!contentById.get(id)?.toLowerCase().includes(needle)) continue;
      const entry = accept(await lifecycleEntry(port, id));
      if (entry) return entry;
    }
    return undefined;
  }

  if (!opts.fallbackToLatestPin) return undefined;
  const latestPin = (await port.listVaultItems({ kind: "pin", limit: 1 }))[0];
  return latestPin ? accept(await lifecycleEntry(port, latestPin.id)) : undefined;
}

function historyTarget(port: MemoryLifecyclePort, args: Record<string, unknown>) {
  return resolveMemoryTarget(port, {
    id: str(args, "id", "entryId", "itemId"),
    needle: str(args, "content", "query", "target"),
    current: false,
    fallbackToLatestPin: true,
  });
}

function supersedeTarget(port: MemoryLifecyclePort, args: Record<string, unknown>) {
  return resolveMemoryTarget(port, {
    id: str(args, "id", "entryId", "itemId"),
    needle: str(args, "target", "old", "oldContent"),
    current: true,
    fallbackToLatestPin: false,
  });
}

function supersedeContent(args: Record<string, unknown>): string | undefined {
  return str(args, "content", "newContent");
}

/** memory_history (read): the whole supersede chain for one entry, oldest → newest. */
export async function readMemoryHistory(
  port: MemoryLifecyclePort,
  args: Record<string, unknown>,
): Promise<unknown> {
  const target = await historyTarget(port, args);
  if (!target) {
    return { available: true, found: false, count: 0, versions: [], message: "no memory matched" };
  }
  const versions = (await port.getEntryHistory(target.id)).map((entry) => ({
    id: entry.id,
    content: entry.content,
    status: statusOf(entry),
    createdAt: entry.createdAt,
    supersededBy: entry.supersededBy,
    archivedAt: entry.archivedAt,
  }));
  return { available: true, found: true, id: target.id, count: versions.length, versions };
}

/** memory_propose_archive (read): stale entries the operator could archive. Writes nothing. */
export async function readMemoryProposeArchive(
  port: MemoryLifecyclePort,
  args: Record<string, unknown>,
): Promise<unknown> {
  const olderThanDays = intArg(args.olderThanDays, 1, STALE_MAX_DAYS) ?? STALE_DEFAULT_DAYS;
  const limit = intArg(args.limit, 1, STALE_MAX_LIMIT) ?? STALE_DEFAULT_LIMIT;
  const entries: MemoryEntry[] = await port.proposeStaleArchive({ olderThanDays, limit });
  return {
    available: true,
    olderThanDays,
    count: entries.length,
    ids: entries.map((entry) => entry.id),
    items: entries.map((entry) => ({
      id: entry.id,
      content: entry.content,
      createdAt: entry.createdAt,
    })),
  };
}

/** memory_supersede (write-high, confirm-gated): replace one current entry. Never deletes. */
export async function writeMemorySupersede(
  port: MemoryLifecyclePort,
  args: Record<string, unknown>,
): Promise<unknown> {
  const content = supersedeContent(args);
  if (!content) throw new Error("content is required for memory_supersede");
  const target = await supersedeTarget(port, args);
  if (!target) {
    return { available: true, superseded: false, message: "no current memory matched" };
  }
  if (target.content.trim().toLowerCase() === content.toLowerCase()) {
    return {
      available: true,
      superseded: false,
      previous: { id: target.id, content: target.content },
      message: "memory already says that",
    };
  }
  const result = await port.supersedeEntry(target.id, { content });
  return {
    available: true,
    superseded: true,
    previous: { id: result.supersededId, content: target.content },
    entry: { id: result.entry.id, content: result.entry.content },
  };
}

/** memory_archive (write-high, confirm-gated): archive exactly the given ids. Never deletes. */
export async function writeMemoryArchive(
  port: MemoryLifecyclePort,
  args: Record<string, unknown>,
): Promise<unknown> {
  const ids = readArchiveIds(args);
  if (ids.length === 0) throw new Error("ids are required for memory_archive");
  const contentById = new Map<string, string>();
  for (const id of ids) {
    const entry = await lifecycleEntry(port, id);
    if (entry) contentById.set(id, entry.content);
  }
  const result = await port.archiveEntries(ids);
  return {
    available: true,
    archivedCount: result.archived.length,
    archived: result.archived,
    alreadyArchived: result.alreadyArchived,
    notFound: result.notFound,
    items: result.archived.map((id) => ({ id, content: contentById.get(id) ?? "" })),
  };
}

export type ConfirmDescription = { text: string; keepConfirm: boolean };

const quote = (content: string) => `"${content}"`;

/** Confirm text naming the exact old and new content; no confirm when nothing would change. */
export async function describeMemorySupersede(
  port: MemoryLifecyclePort,
  args: Record<string, unknown>,
): Promise<ConfirmDescription> {
  const content = supersedeContent(args);
  if (!content) {
    return { text: "Tell me what to replace it with — nothing has changed.", keepConfirm: false };
  }
  const target = await supersedeTarget(port, args);
  if (!target) {
    return { text: "There's no current memory that matches — nothing to replace.", keepConfirm: false };
  }
  if (target.content.trim().toLowerCase() === content.toLowerCase()) {
    return { text: `Your memory already says ${quote(target.content)} — nothing to replace.`, keepConfirm: false };
  }
  return {
    text: `Shall I replace ${quote(target.content)} with ${quote(content)}? Say yes to confirm.`,
    keepConfirm: true,
  };
}

/** Confirm text naming the count and the items that would be archived. */
export async function describeMemoryArchive(
  port: MemoryLifecyclePort,
  args: Record<string, unknown>,
): Promise<ConfirmDescription> {
  const contents: string[] = [];
  for (const id of readArchiveIds(args)) {
    const entry = await lifecycleEntry(port, id);
    if (entry && entry.archivedAt === null) contents.push(entry.content);
  }
  if (contents.length === 0) {
    return { text: "There's nothing to archive.", keepConfirm: false };
  }
  const noun = contents.length === 1 ? "old memory" : "old memories";
  const shown = contents.slice(0, CONFIRM_LIST_MAX).map(quote).join(", ");
  const more =
    contents.length > CONFIRM_LIST_MAX ? ` and ${contents.length - CONFIRM_LIST_MAX} more` : "";
  return {
    text: `Shall I archive ${contents.length} ${noun}: ${shown}${more}? Nothing is deleted. Say yes to confirm.`,
    keepConfirm: true,
  };
}
