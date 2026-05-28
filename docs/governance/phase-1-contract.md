# Zeref — Phase 1 Contract (Implementation)

**Phase:** 1  
**Status:** **APPROVED** (Planner sign-off 2026-05-27)  
**Theme:** Contracts + immutable snapshot DB skeleton

## Planner conditions (C1–C6) — mandatory

| ID | Condition |
|----|-----------|
| **C1** | Include **`platform_accounts`** table (adapter-friendly account identity; Instagram-only values in Phase 1). |
| **C2** | Include **`report_artifacts`** table for report-stage outputs (immutable rows; no UI rendering). |
| **C3** | **CI must run `npm run verify:phase-1`** on every push and PR (in addition to Phase 0 gate). |
| **C4** | Golden fixtures live under **`fixtures/phase-1/`**; contract tests must round-trip representative payloads. |
| **C5** | **No pgvector** (no embedding tables, no vector columns) in Phase 1. |
| **C6** | **Snapshot immutability enforced**: no `UPDATE` of snapshot payload columns; downstream stages reference snapshot IDs only. |

## Goals

- Drizzle schema + migrations for pipeline data model with snapshot immutability.
- `packages/contracts` as single source of truth (Zod-first; OpenAPI derived per ADR-003).
- `npm run verify:phase-1` fails on contract/schema regressions.
- ADRs: ADR-001 (data model), ADR-002 (ID strategy), ADR-003 (OpenAPI-from-Zod).

## Non-goals (out of scope)

- Collectors/scrapers (Instagram or otherwise)
- Cockpit UI
- Jarvis/voice (STT/TTS, tools, sessions)
- Report **rendering** UI (artifacts storage only)
- pgvector / embeddings (C5)
- Production infra, hosting, observability
- Stub job **handlers** in `apps/worker` (contracts/types only)

## Pipeline (locked)

`collect → normalize → analyze → report` — each stage is a **separate job type** reading **immutable** prior outputs (by ID).

## Data model (required tables)

### `platform_accounts` (C1)

- Stable account identity per platform (Phase 1: `platform = instagram`).
- Fields (minimum): `id` (uuid), `platform`, `external_id` (platform user id / handle key), `display_name` (nullable), `metadata_json` (jsonb, optional), `created_at`.
- Unique constraint on (`platform`, `external_id`).

### `snapshots` (C6)

- Immutable collected raw payload.
- Fields (minimum): `id` (uuid), `platform_account_id` (fk, nullable if pre-account collect), `platform`, `kind` (e.g. `instagram_post_raw`, `instagram_profile_raw`), `source_ref`, `content_hash`, `payload_json` (jsonb), `collected_at`, `created_at`.
- **No UPDATE** of `payload_json` / `content_hash` / `collected_at` after insert (enforce via migration trigger or documented invariant + test).

### `normalized_entities`

- Output of normalize stage.
- Fields (minimum): `id`, `snapshot_id` (fk), `schema_version`, `payload_json`, `created_at`.
- Append-only.

### `analysis_outputs`

- Output of analyze stage.
- Fields (minimum): `id`, `normalized_entity_id` (fk) and/or `snapshot_id` (fk), `schema_version`, `payload_json`, `created_at`.
- Append-only.

### `report_artifacts` (C2)

- Output of report stage (stored artifact, not rendered UI).
- Fields (minimum): `id`, `analysis_output_id` (fk) and/or upstream ids, `schema_version`, `artifact_kind`, `payload_json`, `created_at`.
- Append-only.

## Contracts (`packages/contracts`)

- Enums: `Platform`, `SnapshotKind`, `PipelineStage`, `JobType`.
- Branded/plain IDs per ADR-002.
- Job payloads: `CollectJobInput`, `NormalizeJobInput`, `AnalyzeJobInput`, `ReportJobInput` — **immutable IDs only** (no raw blob fields downstream of collect).
- `insufficient_data` pathway in analyze/report contract shapes where applicable.
- Export: `PHASE1_CONTRACT_VERSION` (string).
- Fixtures (C4): `fixtures/phase-1/*.json` used by contract round-trip tests.

## Verify gate (Phase 1)

`npm run verify:phase-1` must:

1. Assert Phase 1 governance files exist (this contract, ADRs if referenced).
2. Run `npm run build`.
3. Assert `PHASE1_CONTRACT_VERSION` export exists in built contracts.
4. Run `@zeref/contracts` tests including fixture round-trips (C4).
5. Assert job payload schemas reject raw blobs where IDs are required.
6. Migration check: migrations present and apply cleanly against Postgres 16 from `docker-compose.yml` (QA defines exact harness).

## CI (C3)

`.github/workflows/ci.yml` must run `npm run verify:phase-1` after `verify:phase-0` (or equivalent ordering) on push + PR.

## ADRs

Index: [docs/governance/adr/README.md](./adr/README.md)

| ADR | Owner | Topic |
|-----|-------|--------|
| [ADR-001](./adr/ADR-001-snapshot-data-model.md) | Data | Table naming, FK graph, immutability enforcement |
| [ADR-002](./adr/ADR-002-id-branding.md) | API/Contracts | ID branding (UUID strings vs branded TS types) |
| [ADR-003](./adr/ADR-003-openapi-from-zod.md) | API/Contracts | OpenAPI derivation from Zod (tooling + CI plan) |

## Acceptance criteria

- All C1–C6 satisfied.
- `npm run verify:phase-0` and `npm run verify:phase-1` pass locally and in CI.
- No out-of-scope features merged.

## Agent ownership

| Agent | Deliverables |
|-------|----------------|
| Data | Drizzle schema + migrations; ADR-001 |
| API/Contracts | Zod schemas, job payloads, fixtures, ADR-002/003 |
| QA | `verify-phase-1.mjs`, migration check, CI update (C3) |
| Docs | ADRs filled, `.planning/STATE.md`, `verify.md` Phase 1 section |
