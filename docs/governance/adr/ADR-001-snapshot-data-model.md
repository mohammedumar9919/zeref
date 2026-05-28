# ADR-001: Snapshot data model (Phase 1 pipeline)

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** Data agent  
**Phase:** 1  
**Related:** [Phase 1 contract](../phase-1-contract.md) (C1, C2, C5, C6) · [ADR index](./README.md) · [ADR-002](./ADR-002-id-branding.md) · [ADR-003](./ADR-003-openapi-from-zod.md) · [verify.md](../verify.md)

## Context

Zeref’s pipeline is `collect → normalize → analyze → report`. Each stage must read **immutable** prior outputs by ID. Phase 1 requires a Postgres schema (Drizzle + SQL migrations) without pgvector (C5).

## Decision

### Table names (snake_case, plural)

| Table | Purpose | Planner ref |
|-------|---------|-------------|
| `platform_accounts` | Stable adapter-facing account identity | C1 |
| `snapshots` | Immutable raw collect payload | C6 |
| `normalized_entities` | Normalize-stage output | — |
| `analysis_outputs` | Analyze-stage output | — |
| `report_artifacts` | Report-stage stored artifact (no UI) | C2 |

### Column naming

- Primary keys: `id` (`uuid`, `gen_random_uuid()`).
- Timestamps: `created_at` (`timestamptz`, default `now()`); snapshots also use `collected_at` (collection time, distinct from insert time).
- JSON payloads: `payload_json` (`jsonb`, required on pipeline output tables).
- Optional account metadata: `metadata_json` on `platform_accounts`.
- Platform identity: `platform` + `external_id` with unique constraint `(platform, external_id)`.
- Snapshot typing: `kind` (text; contract enum `SnapshotKind` lives in `@zeref/contracts`).
- Report typing: `artifact_kind` (text).
- Schema evolution: `schema_version` (text) on downstream tables.

### Foreign key graph

```
platform_accounts
       │
       ▼ (nullable; pre-account collect allowed)
   snapshots ◄────────────────────────────┐
       │                                  │
       ▼                                  │
normalized_entities                      │
       │                                  │
       ▼                                  │
 analysis_outputs ───────────────────────┤ (optional direct snapshot link)
       │                                  │
       ▼                                  │
 report_artifacts ───────────────────────┘ (optional upstream lineage FKs)
```

| From | Column | To | ON DELETE |
|------|--------|-----|-----------|
| `snapshots` | `platform_account_id` | `platform_accounts.id` | SET NULL |
| `normalized_entities` | `snapshot_id` | `snapshots.id` | RESTRICT |
| `analysis_outputs` | `normalized_entity_id` | `normalized_entities.id` | RESTRICT |
| `analysis_outputs` | `snapshot_id` | `snapshots.id` | RESTRICT |
| `report_artifacts` | `analysis_output_id` | `analysis_outputs.id` | RESTRICT |
| `report_artifacts` | `normalized_entity_id` | `normalized_entities.id` | RESTRICT |
| `report_artifacts` | `snapshot_id` | `snapshots.id` | RESTRICT |

**Lineage CHECK constraints**

- `analysis_outputs`: at least one of `normalized_entity_id`, `snapshot_id` must be set.
- `report_artifacts`: at least one of `analysis_output_id`, `normalized_entity_id`, `snapshot_id` must be set.

### Immutability enforcement (C6)

**Choice: PostgreSQL triggers** (migration `0000_phase1_pipeline.sql`), not application-only checks.

1. **`snapshots`** — `BEFORE UPDATE` trigger `snapshots_immutability` blocks changes to `payload_json`, `content_hash`, and `collected_at`. Other columns (e.g. linking `platform_account_id` after account resolution) may still be updated.
2. **`normalized_entities`, `analysis_outputs`, `report_artifacts`** — `BEFORE UPDATE OR DELETE` triggers raise an exception (append-only; new versions = new rows).

Functions: `zeref_enforce_snapshot_immutability()`, `zeref_enforce_append_only()`.

### What we explicitly did not add (C5)

- No `vector` / pgvector columns.
- No embedding or retrieval tables.

## Consequences

- Collect writes once; downstream jobs reference IDs only (aligns with contract job payloads).
- DB rejects accidental mutation of snapshot payloads and downstream rows.
- `@zeref/db` exports Drizzle table objects under `src/schema/`; migrations live in `packages/db/drizzle/`.
- Migration apply + trigger behavior is covered by `@zeref/db` tests (`test/migrations.test.mjs`).

## Verification

```powershell
cd c:\Projects\zeref
docker compose up -d db
npm install
npm run build
npm -w @zeref/db test
```

## Field alignment with contracts (coordination note)

Contract enums (`Platform`, `SnapshotKind`) and branded IDs are owned by `@zeref/contracts` (ADR-002). DB stores:

- `platform`, `kind`, `artifact_kind` as **text** (validated at API/worker boundary).
- All IDs as **uuid** strings compatible with contract UUID branding.
