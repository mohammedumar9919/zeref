# CLOUD-C19a — Memory lifecycle: data layer (supersede, archive, history)

- Agent: cursor worker (laptop worktree)
- Branch: cloud/c19a-memory-lifecycle
- PR: not opened (worker card: push only)
- Status: PUSHED — council review required (`packages/db` migration `0008`)

## Done

- **Migration `0008_c19_memory_lifecycle`:** `memory_entries.superseded_by uuid NULL` (FK → `memory_entries.id` `ON DELETE SET NULL`), `archived_at timestamptz NULL`, btree `memory_entries_superseded_by_idx (superseded_by)`, partial btree `memory_entries_active_idx (created_at) WHERE archived_at IS NULL`. Additive only (no drop, no delete, no cascade). Journal idx 8.
- **Schema:** `memory-entries.ts` gains `supersededBy` (self-reference, `set null`) and `archivedAt`, plus both indexes.
- **Exact-rule contradiction:** still automatic. The new entry insert, `old.observation = 'contradicted'`, `old.superseded_by = new.id` and the `memory_observations` row now run in one transaction (Postgres). The embedding is stored after commit (best effort, as before). Mock does the same.
- **New adapter methods** (both adapters, `memory-service.ts`, `index.ts`):
  - `supersedeEntry(oldId, { content, value?, valueKey? }) → { entry, supersededId }`. One transaction: insert replacement, conditional update of old (`superseded_by IS NULL AND archived_at IS NULL`, else rollback), observation row `{ via: "supersede" }`. Replacement inherits tier, source, entity and metadata (so a superseded pin stays a vault pin); `valueKey` defaults to old's, `value` to `null`. Throws for unknown, already-superseded or archived ids and blank content. Never deletes.
  - `archiveEntries(ids) → { archived, alreadyArchived, notFound }`. Sets `archived_at` once (re-archiving keeps the first timestamp). Never deletes.
  - `proposeStaleArchive({ olderThanDays = 90, limit = 20, now? }) → MemoryEntry[]`. Read-only. Created before the cutoff, not archived, not superseded, not `contradicted`, not a pinned vault item (`source = 'vault'` and `metadata.kind = 'pin'`). Oldest first.
  - `getEntryHistory(id) → MemoryLifecycleEntry[]`. Every entry connected to `id` through `superseded_by` (both directions), including contradicted and archived ones, each with `supersededBy` and `archivedAt`. Ordered so each entry precedes its replacement (ties: oldest first). `[]` for unknown ids.
- **Search:** archived entries are hidden by default in lexical (blank and non-blank query) and the vector side of hybrid; `includeArchived: true` shows them. Contradicted behaviour unchanged. No vector-only path.
- **Vault forget:** unchanged hard delete. Postgres relies on the FK (`SET NULL`); the mock nulls neighbours' `supersededBy` itself.

## Deviations from the card (for council)

1. `MemoryEntrySchema` in `@zeref/contracts` is `.strict()` and contracts are out of scope, so `supersededBy`/`archivedAt` are not on `MemoryEntry`. History returns a new local type `MemoryLifecycleEntry = MemoryEntry & { supersededBy, archivedAt }`. The mock keeps the two fields in a side map.
2. `proposeStaleArchive` also skips `observation = 'contradicted'` rows (entries contradicted before this migration have no `superseded_by` but are already replaced).
3. `archiveEntries` also bumps `updated_at`.
4. New shared module `src/lifecycle.ts` (refusal rules, stale window/predicate, supersede draft, chain walk and ordering) so both adapters apply the same rules.

## Tests

No `DATABASE_URL` and no Docker on this machine.

- `npx tsc -b tsconfig.build.json` / `npm run lint`: clean.
- `@zeref/zeref-memory`: 63 pass, 0 fail, 0 cancelled. New `lifecycle-behaviour.mjs` (7 shared behaviours: exact-rule link, supersede, refusals, archive idempotence + search hiding, stale proposals read-only/pin/archived/superseded/recent, history both ways, vault forget nulls links) runs against the mock in `lifecycle.test.mjs` and against Postgres in `lifecycle-postgres.test.mjs` (skips without `DATABASE_URL` or without the 0008 columns). `lifecycle.test.mjs` also checks the strict contract does not leak lifecycle fields and that no lifecycle method source contains a delete path.
- `@zeref/db`: 6 pass; the Postgres migration suite is skipped locally. New DB-gated test: columns/indexes exist, FK rejects unknown ids, deleting the middle of a chain keeps both neighbours and nulls their links. Journal test expects `0008` last and checks the SQL text.
- `@zeref/web` (`node --import tsx --test`): 214 pass, 0 fail, 3 skipped.
- Jarvis eval (`ZEREF_LLM_MOCK=1 ZEREF_BFF_FIXTURE=1 ZEREF_PHASE11_AGENT=1`): 10/10, task 100%, tool 100%, 0 unsafe.

## Risks / follow-up

- The Postgres adapter now selects `superseded_by`/`archived_at`: run `npm run db:migrate` before deploying this code against an existing database.
- CI runs the `@zeref/db` migration suite against Postgres (`db-phases`), but the zeref-memory Postgres suites run in `ui-b` without `DATABASE_URL` and skip there (same as C3/C4). Laptop: `npm run db:migrate`, then `npm test -w @zeref/zeref-memory -w @zeref/db` with `DATABASE_URL` set.
- `getEntryHistory` issues one query per chain hop (chains are short).
- Pre-existing, unchanged: a blank-query search hides only `contradicted`, a non-blank one requires `verified`.
