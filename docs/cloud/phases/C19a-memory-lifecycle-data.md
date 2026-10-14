# C19a — Memory lifecycle: data layer (supersede, archive, history)

Part 1 of C19 ([vision intake](../../superpowers/plans/2026-09-30-vision-intake.md) §4 H2b, §6 decision 1). C19b (wave 2) adds the confirm-gated Jarvis tools and the HUD history view on top of this.

**Council review required** (`packages/db` migration `0008`).

## Today

- `memory_entries` has `observation` (`verified` | `contradicted` | …). Exact same-key rule: saving a new `value` for an existing `valueKey` marks the old entry `contradicted` (`postgres-adapter.ts` ~L221, mock ~L121). Search hides `contradicted` unless asked.
- Vault forget (C3) hard-deletes (operator's explicit request) — **keep it**.
- Nothing links an old value to the value that replaced it; no archive; no history query.

## Operator decision (binding)

Exact-rule contradiction stays **automatic** — it is the operator's own correction. The old value must stay visible in history. Only *suspected* (semantic, C5) matches and stale-archive proposals ask first (C19b).

## Deliverables

1. Migration `0008_c19_memory_lifecycle.sql`: `memory_entries.superseded_by uuid NULL REFERENCES memory_entries(id) ON DELETE SET NULL`, `archived_at timestamptz NULL`, index on `superseded_by`, partial index on `archived_at IS NULL`. Drizzle schema + journal entry + `packages/db/test/migrations.test.mjs` update.
2. Exact-rule path: when the old entry is marked `contradicted`, also set `old.superseded_by = new.id` (same transaction). Postgres and mock adapters behave the same.
3. New adapter methods (both adapters, exported via `memory-service.ts` and `index.ts`):
   - `supersedeEntry(oldId, { content, value?, valueKey? })` → creates the new entry, links `old.superseded_by`, marks old `contradicted`; refuses if old is already superseded or archived. **Never deletes.** (C19b will call this only after a confirm.)
   - `archiveEntries(ids)` → sets `archived_at`; idempotent; never deletes.
   - `proposeStaleArchive({ olderThanDays = 90, limit = 20 })` → read-only list of candidates (not pinned vault items, not already archived/superseded), oldest first. Writes nothing.
   - `getEntryHistory(id)` → the full chain (oldest → newest) following `superseded_by` both ways, including contradicted and archived entries, each with `createdAt`, `observation`, `archivedAt`.
4. Search (lexical and hybrid C4) excludes archived entries by default; `includeArchived` option. Contradicted behaviour unchanged.
5. Vault forget still hard-deletes; if a forgotten entry was in a chain, neighbours' `superseded_by` becomes NULL (FK `SET NULL`) — test it.

## Rules

- No kernel, web, contracts or UI changes (C19b).
- Never delete in supersede/archive paths (test-enforced).
- Hybrid search only — never vector-only.
- Do not edit `eval/**`.
