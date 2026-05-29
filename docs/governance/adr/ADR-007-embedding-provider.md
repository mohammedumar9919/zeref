# ADR-007: Embedding provider, dimensions, and CI mock (Q1, C16)

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** Data agent  
**Phase:** 3  
**Related:** [Phase 3 contract](../phase-3-contract.md) (Q1, C16) · [ADR index](./README.md) · [ADR-008](./ADR-008-normalize-embed-chain.md) · [ADR-010](./ADR-010-verify-phase-3-harness.md) · [verify.md](../verify.md)

## Context

Phase 3 adds `embedding_vectors` with pgvector. Production embeddings must be consistent and testable; CI must not call live embed APIs (Q1). Dimension drift breaks retrieval and storage (C16).

## Decision

### Default provider (Q1)

| Setting | Value |
|---------|--------|
| Production default | **OpenAI `text-embedding-3-small`** |
| Dev override | `ZEREF_EMBED_PROVIDER=nomic` + local sidecar URL (optional; not used in CI) |
| CI / verify | **Mocked deterministic vectors** — hash-derived fixed-length floats, no network |

Worker/embed package selects provider from env; **database column type does not change** per provider in Phase 3.

### Locked dimensions (C16)

| Item | Value |
|------|--------|
| Model | `text-embedding-3-small` |
| Dimensions | **1536** |
| SQL column | `embedding vector(1536) NOT NULL` |
| Row metadata | `dimensions integer NOT NULL` with `CHECK (dimensions = 1536)` |

Migration: `packages/db/drizzle/0001_phase3_analytics_embeddings.sql`. Drizzle: `EMBEDDING_DIMENSIONS = 1536`, `vector('embedding', { dimensions: 1536 })`.

**Rule:** Any new model with different width requires a **new migration** (new column or table); never alter `vector(1536)` in place.

### Dedupe

- `embedding_vectors`: `UNIQUE (normalized_entity_id, model)`.
- `content_hash`: text fingerprint of normalized embed input (re-embed same content → new row only if hash/model policy changes; unique index prevents duplicate model rows per entity).

### CI mock (Q1)

- `verify:phase-3` and `@zeref/db` tests use **deterministic mock embeddings** (same input → same vector).
- No `OPENAI_API_KEY` required in CI for embed path.
- Live OpenAI/nomic only in local dev when explicitly configured.

## Consequences

- Retrieval goldens (C15) target 1536-d vectors from mock provider in CI.
- Nomic or other providers must emit 1536 floats in Phase 3 or stay dev-only until a dimension ADR+migration exists.
- `DEFAULT_EMBEDDING_MODEL` exported from `@zeref/db` for worker/contracts alignment.

## Verification

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
npm -w @zeref/db test
```

Included in `npm run verify:phase-3` (ADR-010). CI uses mock provider only — no live embed API.
