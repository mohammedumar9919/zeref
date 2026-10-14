import assert from "node:assert/strict";
import { it } from "node:test";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * C19a lifecycle behaviour shared by the mock and Postgres adapters.
 * `ctx.adapter()` returns the adapter under test; `ctx.track(id)` registers
 * rows for cleanup; `ctx.ready()` returns false to skip (unmigrated DB).
 */
export function registerLifecycleBehaviour(ctx) {
  const tag = () => `c19a${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

  async function save(input) {
    const result = await ctx.adapter().saveMemory(input);
    ctx.track(result.entry.id);
    return result;
  }

  async function supersede(oldId, input) {
    const result = await ctx.adapter().supersedeEntry(oldId, input);
    ctx.track(result.entry.id);
    return result;
  }

  async function historyIds(id) {
    return (await ctx.adapter().getEntryHistory(id)).map((e) => e.id);
  }

  it("exact-rule contradiction links old.supersededBy to the new entry", async (t) => {
    if (!(await ctx.ready())) return t.skip("lifecycle columns not migrated");
    const adapter = ctx.adapter();
    const entity = await adapter.createEntity({ type: "preference", name: tag() });
    ctx.trackEntity?.(entity.id);
    const base = { source: "voice", entityId: entity.id, valueKey: "theme", tier: "semantic" };
    const first = await save({ ...base, content: "User prefers dark theme.", value: "dark" });
    const second = await save({ ...base, content: "User prefers light theme.", value: "light" });

    assert.deepEqual(second.contradictions, [
      { supersededId: first.entry.id, entryId: second.entry.id },
    ]);
    const history = await adapter.getEntryHistory(second.entry.id);
    assert.deepEqual(
      history.map((e) => [e.id, e.observation, e.supersededBy, e.archivedAt]),
      [
        [first.entry.id, "contradicted", second.entry.id, null],
        [second.entry.id, "verified", null, null],
      ],
    );
    assert.deepEqual(await historyIds(first.entry.id), [first.entry.id, second.entry.id]);
  });

  it("supersedeEntry creates the replacement, links and contradicts the old one, never deletes", async (t) => {
    if (!(await ctx.ready())) return t.skip("lifecycle columns not migrated");
    const adapter = ctx.adapter();
    const word = tag();
    const { entry: old } = await save({
      content: `${word} posting time is 7pm`,
      source: "vault",
      tier: "semantic",
      valueKey: "posting_time",
      value: "7pm",
      metadata: { kind: "correction" },
    });

    const { entry, supersededId } = await supersede(old.id, {
      content: `${word} posting time is 9pm`,
      value: "9pm",
    });
    assert.equal(supersededId, old.id);
    assert.notEqual(entry.id, old.id);
    assert.equal(entry.observation, "verified");
    assert.equal(entry.source, "vault");
    assert.equal(entry.tier, "semantic");
    assert.equal(entry.valueKey, "posting_time");
    assert.equal(entry.value, "9pm");
    assert.equal(entry.metadata.kind, "correction");

    const history = await adapter.getEntryHistory(old.id);
    assert.deepEqual(
      history.map((e) => [e.id, e.observation, e.supersededBy]),
      [
        [old.id, "contradicted", entry.id],
        [entry.id, "verified", null],
      ],
    );
    for (const e of history) {
      assert.equal(typeof e.createdAt, "string");
      assert.equal(e.archivedAt, null);
    }

    const visible = await adapter.searchMemory(word, { limit: 50 });
    assert.deepEqual(visible.results.map((r) => r.entry.id), [entry.id]);
    const all = await adapter.searchMemory(word, { limit: 50, includeContradicted: true });
    assert.deepEqual(
      all.results.map((r) => r.entry.id).sort(),
      [old.id, entry.id].sort(),
      "the superseded entry still exists",
    );
  });

  it("supersedeEntry refuses superseded, archived, unknown ids and blank content", async (t) => {
    if (!(await ctx.ready())) return t.skip("lifecycle columns not migrated");
    const adapter = ctx.adapter();
    const { entry: old } = await save({ content: `${tag()} supersede once`, source: "manual" });
    await supersede(old.id, { content: "replacement" });
    await assert.rejects(() => adapter.supersedeEntry(old.id, { content: "again" }), /already superseded/);

    const { entry: archived } = await save({ content: `${tag()} archived`, source: "manual" });
    await adapter.archiveEntries([archived.id]);
    await assert.rejects(() => adapter.supersedeEntry(archived.id, { content: "x" }), /archived/);

    await assert.rejects(
      () => adapter.supersedeEntry("00000000-0000-4000-8000-000000000000", { content: "x" }),
      /not found/,
    );
    await assert.rejects(() => adapter.supersedeEntry("not-a-uuid", { content: "x" }), /not found/);

    const { entry: fresh } = await save({ content: `${tag()} blank`, source: "manual" });
    await assert.rejects(() => adapter.supersedeEntry(fresh.id, { content: "   " }), /required/);
    assert.deepEqual(await historyIds(fresh.id), [fresh.id], "a refused supersede writes nothing");
  });

  it("archiveEntries is idempotent, keeps rows, and search hides archived by default", async (t) => {
    if (!(await ctx.ready())) return t.skip("lifecycle columns not migrated");
    const adapter = ctx.adapter();
    const word = tag();
    const { entry: keep } = await save({ content: `${word} keep me`, source: "manual" });
    const { entry: gone } = await save({ content: `${word} archive me`, source: "manual" });
    const unknown = "00000000-0000-4000-8000-000000000001";

    const first = await adapter.archiveEntries([gone.id, gone.id, unknown, "bogus"]);
    assert.deepEqual(first.archived, [gone.id]);
    assert.deepEqual(first.alreadyArchived, []);
    assert.deepEqual([...first.notFound].sort(), [unknown, "bogus"].sort());

    const [archivedRow] = await adapter.getEntryHistory(gone.id);
    assert.equal(typeof archivedRow.archivedAt, "string");

    const second = await adapter.archiveEntries([gone.id]);
    assert.deepEqual(second, { archived: [], alreadyArchived: [gone.id], notFound: [] });
    const [again] = await adapter.getEntryHistory(gone.id);
    assert.equal(again.archivedAt, archivedRow.archivedAt, "re-archiving keeps the first timestamp");

    const visible = await adapter.searchMemory(word, { limit: 50 });
    assert.deepEqual(visible.results.map((r) => r.entry.id), [keep.id]);
    const withArchived = await adapter.searchMemory(word, { limit: 50, includeArchived: true });
    assert.deepEqual(
      withArchived.results.map((r) => r.entry.id).sort(),
      [keep.id, gone.id].sort(),
    );
    const blank = await adapter.searchMemory("", { limit: 100000 });
    assert.ok(!blank.results.some((r) => r.entry.id === gone.id), "blank query hides archived too");
  });

  it("proposeStaleArchive is read-only, oldest first, and skips pins, archived, superseded, recent", async (t) => {
    if (!(await ctx.ready())) return t.skip("lifecycle columns not migrated");
    const adapter = ctx.adapter();
    const now = new Date();
    const daysAgo = (n) => new Date(now.getTime() - n * DAY_MS);
    // Far older than any real row so they sort first even in a shared database.
    const ancient = (n) => new Date(Date.UTC(1990, 0, 1) + n * 1000);
    const word = tag();

    const { entry: oldest } = await save({ content: `${word} a`, source: "manual", createdAt: ancient(1) });
    const { entry: older } = await save({ content: `${word} b`, source: "manual", createdAt: ancient(2) });
    const { entry: recent } = await save({ content: `${word} c`, source: "manual", createdAt: daysAgo(10) });
    const { entry: pin } = await save({
      content: `${word} pinned`,
      source: "vault",
      tier: "semantic",
      metadata: { kind: "pin" },
      createdAt: ancient(0),
    });
    const { entry: archived } = await save({ content: `${word} d`, source: "manual", createdAt: ancient(3) });
    await adapter.archiveEntries([archived.id]);
    const { entry: superseded } = await save({ content: `${word} e`, source: "manual", createdAt: ancient(4) });
    const { entry: replacement } = await supersede(superseded.id, { content: `${word} e2` });

    const before = await adapter.searchMemory(word, { limit: 50, includeArchived: true, includeContradicted: true });
    const proposed = await adapter.proposeStaleArchive({ olderThanDays: 90, limit: 100000 });
    const mine = new Set([oldest.id, older.id, recent.id, pin.id, archived.id, superseded.id, replacement.id]);
    assert.deepEqual(
      proposed.filter((e) => mine.has(e.id)).map((e) => e.id),
      [oldest.id, older.id],
    );
    for (let i = 1; i < proposed.length; i += 1) {
      assert.ok(Date.parse(proposed[i - 1].createdAt) <= Date.parse(proposed[i].createdAt));
    }

    const limited = await adapter.proposeStaleArchive({ olderThanDays: 90, limit: 1 });
    assert.equal(limited.length, 1);
    assert.deepEqual(await adapter.proposeStaleArchive({ limit: 0 }), []);
    await assert.rejects(() => adapter.proposeStaleArchive({ olderThanDays: -1 }), RangeError);

    const withRecent = await adapter.proposeStaleArchive({ olderThanDays: 5, limit: 100000 });
    assert.ok(withRecent.some((e) => e.id === recent.id));

    const after = await adapter.searchMemory(word, { limit: 50, includeArchived: true, includeContradicted: true });
    assert.deepEqual(
      after.results.map((r) => [r.entry.id, r.entry.observation, r.entry.updatedAt]).sort(),
      before.results.map((r) => [r.entry.id, r.entry.observation, r.entry.updatedAt]).sort(),
      "proposals write nothing",
    );
    for (const id of [oldest.id, older.id]) {
      const [row] = await adapter.getEntryHistory(id);
      assert.equal(row.archivedAt, null);
    }
  });

  it("getEntryHistory walks the whole chain both ways, oldest to newest", async (t) => {
    if (!(await ctx.ready())) return t.skip("lifecycle columns not migrated");
    const adapter = ctx.adapter();
    const { entry: v1 } = await save({ content: `${tag()} v1`, source: "manual" });
    const { entry: v2 } = await supersede(v1.id, { content: "v2" });
    const { entry: v3 } = await supersede(v2.id, { content: "v3" });
    await adapter.archiveEntries([v3.id]);

    for (const start of [v1.id, v2.id, v3.id]) {
      assert.deepEqual(await historyIds(start), [v1.id, v2.id, v3.id]);
    }
    const history = await adapter.getEntryHistory(v2.id);
    assert.deepEqual(history.map((e) => e.observation), ["contradicted", "contradicted", "verified"]);
    assert.equal(history[2].archivedAt !== null, true, "archived entries stay in history");

    const { entry: lone } = await save({ content: `${tag()} lone`, source: "manual" });
    assert.deepEqual(await historyIds(lone.id), [lone.id]);
    assert.deepEqual(await adapter.getEntryHistory("00000000-0000-4000-8000-000000000002"), []);
    assert.deepEqual(await adapter.getEntryHistory("not-a-uuid"), []);
  });

  it("vault forget still hard-deletes and nulls neighbours' supersededBy", async (t) => {
    if (!(await ctx.ready())) return t.skip("lifecycle columns not migrated");
    const adapter = ctx.adapter();
    const v1 = await adapter.saveVaultItem({ kind: "pin", content: `${tag()} pin v1` });
    ctx.track(v1.id);
    const { entry: v2 } = await supersede(v1.id, { content: "pin v2" });
    const { entry: v3 } = await supersede(v2.id, { content: "pin v3" });

    assert.deepEqual(await adapter.forgetVaultItem(v2.id), { deleted: true });
    assert.deepEqual(await adapter.getEntryHistory(v2.id), []);
    const [first] = await adapter.getEntryHistory(v1.id);
    assert.equal(first.id, v1.id);
    assert.equal(first.supersededBy, null);
    assert.equal(first.observation, "contradicted");
    assert.deepEqual(await historyIds(v3.id), [v3.id]);
    const pins = await adapter.listVaultItems({ kind: "pin", limit: 100000 });
    assert.ok(pins.some((p) => p.id === v3.id));
  });

  it("vault list shows only current pins (hides superseded and archived)", async (t) => {
    if (!(await ctx.ready())) return t.skip("lifecycle columns not migrated");
    const adapter = ctx.adapter();
    const old = await adapter.saveVaultItem({ kind: "pin", content: `${tag()} list old` });
    ctx.track(old.id);
    const { entry: current } = await supersede(old.id, { content: "list new" });
    const gone = await adapter.saveVaultItem({ kind: "pin", content: `${tag()} list archived` });
    ctx.track(gone.id);
    await adapter.archiveEntries([gone.id]);

    const ids = (await adapter.listVaultItems({ kind: "pin", limit: 100000 })).map((p) => p.id);
    assert.ok(ids.includes(current.id));
    assert.ok(!ids.includes(old.id));
    assert.ok(!ids.includes(gone.id));
  });
}
