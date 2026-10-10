# CLOUD-C4 — Vector memory recall (hybrid RRF)

- Agent: cursor worker (laptop worktree)
- Branch: cloud/c4-vector-recall
- PR: not opened (worker card: push only)
- Status: PUSHED — council review required (`packages/db/**`, shared embedder move)

## Done

- **Migration `0007_memory_entry_embeddings`:** new table `memory_entry_embeddings (entry_id uuid PK → memory_entries.id ON DELETE CASCADE, model text, embedding vector(1536), content_hash text, created_at timestamptz default now())` plus a btree index on `model`. Journal entry idx 7. `embedding_vectors` is untouched (stays append-only). No ANN index: exact cosine scan, filtered by model/tier/observation.
- **Schema:** `packages/db/src/schema/memory-entry-embeddings.ts`, exported and added to `schema`.
- **Embedder move:** `apps/worker/src/lib/embed-provider.ts` moved verbatim to `packages/analytics/src/embed-provider.ts` and exported from `@zeref/analytics`. The worker file is now a re-export. `@zeref/analytics` depends on `@zeref/db` (no cycle); `@zeref/web` depends on `@zeref/analytics`.
- **zeref-memory:**
  - `fuse.ts`: `fuseRrf(lists, k = 60)` (score = Σ 1/(k + rank), 1-based rank, duplicate id in one list counted once, ties keep first-appearance order), `tryEmbed` (errors → `null`), `hybridFuse` (lexical top-20 ∪ vector top-20 → RRF; returns `null` → caller keeps lexical ranking when there is no embedder, a blank query, an embed error or a vector-search error).
  - `createPostgresMemoryAdapter(db, opts?: { embed?, embedModel? })`. Without `embed`, behaviour is unchanged (lexical, temporal-score ranking). `useEmbedder(embed, model)` attaches an embedder to the cached service adapter.
  - Save: after inserting the entry, best-effort insert of one embedding row. Embed or insert failure leaves the entry without an embedding; save still succeeds.
  - Search: lexical list as before; with an embedder, vector candidates are entries with an embedding of the same `model`, same tier/observation filters, ordered by cosine distance. Fused score is the RRF score. There is no vector-only path.
- **Web:** `memory-port.ts` attaches `embedText(…, DEFAULT_EMBEDDING_MODEL)` from `@zeref/analytics` to the Postgres adapter (mock adapter stays lexical). Model label stored is `mock-sha256` when `ZEREF_EMBED_PROVIDER` is unset/`mock`, otherwise `text-embedding-3-small`, so mock vectors are never compared with provider vectors.

Mock embeddings are sha256-derived and carry no meaning. Tests assert wiring, fusion math and exact-text hits only.

## Deviations from the card (for council)

1. `packages/analytics/tsconfig.json` (not listed): added a project reference to `../db` so `tsc -b` builds `@zeref/db` before analytics on a clean checkout.
2. `packages/db/test/migrations.test.mjs` (added to allowed paths by the lead): table count 19 → 20, cascade test for `memory_entry_embeddings`, journal test now expects `0007` last and increasing `when`.
3. `memory-service.ts` is outside the card, so the web port attaches the embedder to the cached singleton via `useEmbedder` (on port creation and before each call) instead of passing `opts` at construction. Other web routes that call `searchMemory` directly are hybrid only once a Jarvis memory port has been created in that process.
4. `mock-adapter.ts` unchanged (stays lexical).
5. `web` memory port now passes `limit` to `searchMemory` (was default 10, then sliced).

## Tests

No `DATABASE_URL` and no Docker on this machine.

- `npx tsc -b tsconfig.build.json` / `npm run lint`: clean.
- `@zeref/analytics`: 15/15.
- `@zeref/zeref-memory`: 51 pass, 0 fail. New `fuse.test.mjs` (17 tests). `vector-recall-postgres.test.mjs` (7 tests: embedding row on save, cascade on vault forget, exact-text hit first with score 2/61, lexical match kept, embed failure → no row + lexical search, no embed → lexical, `useEmbedder`) skips without `DATABASE_URL` or without the migrated table.
- `@zeref/db`: 6 pass; the Postgres migration suite is skipped (no Docker/`DATABASE_URL`).
- `@zeref/worker`: 44 pass, 0 fail, 8 cancelled (Postgres integration suites; hook cannot reach Postgres). Re-export checked: same `embedText` function, 1536-d mock vector.
- `@zeref/web` (`node --import tsx --test test/*.test.mjs test/jarvis/*.test.mjs`): 206 pass, 0 fail, 3 skipped.
- Jarvis eval (`ZEREF_LLM_MOCK=1 ZEREF_BFF_FIXTURE=1 ZEREF_PHASE11_AGENT=1`): 10/10, task 100%, tool 100%, 0 unsafe.

## Laptop follow-up

- `npm run db:migrate` against Docker `:55432`, then run `npm test -w @zeref/zeref-memory -w @zeref/db` with `DATABASE_URL` set.
- Live Jarvis: "pin this: post reels at 7pm", then "what did I pin about reels" returns the vault item.
- Entries saved before this migration have no embedding; they are still found lexically. No backfill was added.
