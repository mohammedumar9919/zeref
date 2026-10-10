# CLOUD-C4 — Vector memory recall (hybrid RRF) — WEEK 2

**Queue ID:** CLOUD-C4  
**Status:** see [../QUEUE.md](../QUEUE.md) (`NEXT` until C5 merged)  
**Remote:** Partial — code + unit tests in cloud; migration verified by CI Postgres + laptop  
**Depends on:** CLOUD-C3 and CLOUD-C5 merged  
**Branch prefix:** `cloud/c4-`  
**Council review:** mandatory (`packages/db/**`, shared embedder move)  
**Migration number:** `0007` (reserved — no other card may add a migration until this merges)

## Goal

Jarvis memory search is lexical (`ILIKE` in `postgres-adapter.ts`). Add vector recall and **fuse** it with lexical results using Reciprocal Rank Fusion. Never vector-only.

## Design (decided by council)

- New table `memory_entry_embeddings (entry_id uuid PK REFERENCES memory_entries(id) ON DELETE CASCADE, model text, embedding vector(1536), content_hash text, created_at timestamptz default now())`. **Not** `embedding_vectors` (append-only; would break vault forget).
- Embedder moves to a shared package: `packages/analytics/src/embed-provider.ts` (moved verbatim from `apps/worker/src/lib/embed-provider.ts`; worker file re-exports it). `zeref-memory` never imports `apps/**`.
- `createPostgresMemoryAdapter(db, opts?: { embed?: (text: string) => Promise<number[]> })` — today it takes only `db`; `embed` is optional so existing callers and DB-less unit tests still construct. Without `embed`, search stays lexical. Web injects it in `apps/web/lib/jarvis/memory-port.ts`.
- The moved `embed-provider.ts` imports `EMBEDDING_DIMENSIONS` from `@zeref/db` → add `@zeref/db` to `packages/analytics/package.json` (no cycle: db does not depend on analytics) and `@zeref/analytics` to `apps/web/package.json`.
- `fuseRrf(lists, k = 60)` pure function; search = lexical top-20 ∪ vector top-20 → RRF → limit.
- Mock embeddings (sha256) carry **no meaning**: tests assert wiring, fusion math and exact-text hits only. No semantic-quality claims anywhere in docs or PR.

## Allowed paths

- `packages/db/drizzle/0007_memory_entry_embeddings.sql` (create), `packages/db/drizzle/meta/_journal.json`, `packages/db/src/schema/memory-entry-embeddings.ts` (create), `packages/db/src/schema/index.ts`
- `packages/analytics/src/embed-provider.ts` (create), `packages/analytics/src/index.ts`, `packages/analytics/package.json`, `apps/web/package.json` (dependency lines only), `package-lock.json`, `apps/worker/src/lib/embed-provider.ts` (re-export only)
- `packages/zeref-memory/src/fuse.ts` (create), `postgres-adapter.ts`, `mock-adapter.ts`, `types.ts`, `index.ts`
- `packages/zeref-memory/test/fuse.test.mjs` (create), `test/vector-recall-postgres.test.mjs` (create, skips without `DATABASE_URL`)
- `apps/web/lib/jarvis/memory-port.ts`
- `docs/cloud/log/CLOUD-C4.md` (create)

## Forbidden

- Vector-only search path; writing to `embedding_vectors`
- `eval/**`, kernel risk tiers, UI
- Live embedding providers in CI (mock default stays)

## Tests (write first)

- `fuse.test.mjs`: item ranked 1st in both lists wins; item only in one list still appears; `k` changes scores as expected; stable tie order.
- postgres: save → embedding row exists; forget (C3) → embedding row gone (cascade); search returns exact-text hit first.
- worker embed tests still green after the move.

## Verify

```bash
npm run lint
npm test -w @zeref/analytics -w @zeref/zeref-memory -w @zeref/db -w @zeref/worker -w @zeref/web
gh pr checks <PR> --watch   # CI runs the Postgres tests
```

## Laptop follow-up

- `npm run db:migrate` against Docker `:55432`; live Jarvis "what did I pin about reels" returns the vault item.
