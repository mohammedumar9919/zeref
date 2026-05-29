# ADR-008: Phase 3 schema and normalize→embed chain (Q2, Q3)

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** Data agent  
**Phase:** 3  
**Related:** [Phase 3 contract](../phase-3-contract.md) (Q2, Q3) · [ADR index](./README.md) · [ADR-001](./ADR-001-snapshot-data-model.md) · [ADR-007](./ADR-007-embedding-provider.md) · [ADR-009](./ADR-009-worker-normalize-boundaries.md) · [verify.md](../verify.md)

## Context

Phase 3 extends the pipeline to `collect → normalize → embed → …`. Planner locked two job types (Q2) and `metric_facts` shape with `platform_account_id` (Q3). Data layer must preserve FK integrity and append-only rules from Phase 1.

## Decision

### New tables (migration `0001_phase3_analytics_embeddings`)

#### `metric_facts` (Q3)

Written by **normalize** only. Links snapshot, normalized entity, and platform account.

| Column | FK / notes |
|--------|------------|
| `snapshot_id` | → `snapshots.id` (RESTRICT) |
| `normalized_entity_id` | → `normalized_entities.id` (RESTRICT) |
| `platform_account_id` | → `platform_accounts.id` (RESTRICT, **required**) |
| `metric_version` | e.g. `phase3-v1` |
| `engagement_score` | `numeric`, nullable when `insufficient_data` |
| `niche_tags` | `jsonb` (string array) |
| `insufficient_data` | `boolean` |
| `facts_json` | extensible `jsonb` |

**Account resolution:** `platform_account_id` is copied from `snapshots.platform_account_id` at normalize time. If the snapshot has no linked account, normalize must not insert metric facts (contract: honest `insufficient_data` / worker error path — Worker ADR-009).

#### `embedding_vectors` (C16)

Written by **embed** only. Reads **normalized entity by ID**; does not re-fetch snapshot payload for embedding text (contract).

| Column | FK / notes |
|--------|------------|
| `normalized_entity_id` | → `normalized_entities.id` (RESTRICT) |
| `model` | e.g. `text-embedding-3-small` |
| `dimensions` | must be `1536` (CHECK) |
| `embedding` | `vector(1536)` |
| `content_hash` | dedupe fingerprint |

`UNIQUE (normalized_entity_id, model)` — one embedding row per entity per model.

### Append-only enforcement

Reuses `zeref_enforce_append_only()` from Phase 1:

- `metric_facts` — no UPDATE/DELETE
- `embedding_vectors` — no UPDATE/DELETE

New versions = new rows (new `content_hash` or new model requires handling via new row after unique constraint policy).

### Job chain policy (Q2)

| Job | Reads | Writes |
|-----|-------|--------|
| `normalize` | `snapshots` by `snapshotId` | `normalized_entities`, `metric_facts` |
| `embed` | `normalized_entities` by `normalizedEntityId` | `embedding_vectors` |

**Two distinct job types** in pg-boss registry (`collect`, `normalize`, `embed` only — C12).

**Auto-chain (optional):** After successful `normalize`, the worker **may** run `embed` inline or enqueue `EmbedJobInput` in the **same process**. Policy:

- Default in dev: **auto-chain enabled** when `ZEREF_AUTO_EMBED !== '0'`.
- Explicit `scripts/enqueue-embed.mjs` always supported for retries and tests.
- Auto-chain must pass the **new** `normalizedEntityId` from `NormalizeJobOutput`; embed must not read snapshots.

Documented here; implementation in Worker (ADR-009).

### FK graph (Phase 3 extension)

```
platform_accounts ◄── metric_facts ──► snapshots
        ▲                  │
        │                  ▼
        └──────── normalized_entities ◄── embedding_vectors
```

## Consequences

- Analyze/report (Phase 4+) can join `metric_facts` by `platform_account_id` for account-scoped analytics.
- Embed stage is independently testable and enqueueable.
- Contracts: `NormalizeJobOutput` includes `metricFactId?`, `platformAccountId?`; `EmbedJobInput` uses `normalizedEntityId` only.

## Out of scope (this ADR)

- `@zeref/analytics` formulas
- Worker handler code (ADR-009)
- analyze / report tables

## Verification

See [ADR-007](./ADR-007-embedding-provider.md), [ADR-009](./ADR-009-worker-normalize-boundaries.md), and `npm run verify:phase-3`.
