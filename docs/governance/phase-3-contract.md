# Zeref — Phase 3 Contract (Implementation)

**Phase:** 3  
**Status:** **APPROVED** (Planner sign-off)  
**Theme:** Normalize stage + analytics + embeddings (pgvector)

**Prerequisites:** Phases 0–2 approved (`verify:phase-2` green; tip `90f60ac`).

---

## Planner decisions (binding)

### Open questions (Q1–Q3)

| # | Decision |
|---|----------|
| **Q1** | **OpenAI `text-embedding-3-small`** default. CI uses **mocked deterministic vectors** (no live embed API). Optional **`ZEREF_EMBED_PROVIDER=nomic`** + local sidecar URL for dev only. Document in **ADR-007**. |
| **Q2** | **Two job types:** `normalize` then `embed`. Worker **may auto-chain** `embed` immediately after successful `normalize` (same process); document chaining policy in **ADR-008**. Separate `EmbedJobInput` / handlers remain for explicit enqueue. |
| **Q3** | `metric_facts` per schema below, including **`platform_account_id`** FK column (from snapshot → account). Honest `insufficient_data` when sparse. |

### Conditions (C11–C16)

| ID | Condition |
|----|-----------|
| **C11** | `NormalizeJobOutput`, `EmbedJobInput`/`EmbedJobOutput` in `@zeref/contracts`; export **`PHASE3_CONTRACT_VERSION`**. |
| **C12** | Worker registry: **`collect`**, **`normalize`**, **`embed`** only — no `analyze` / `report`. |
| **C13** | CI runs **`npm run verify:phase-3`** after `verify:phase-2` (same implementation wave). |
| **C14** | `normalize` and `embed` code paths must **NOT** import `@zeref/instagram`; **`verify:phase-3` enforces** (static grep/guard). |
| **C15** | **retrieval@3 ≥ 1.0** on `fixtures/phase-3/retrieval/` golden set. |
| **C16** | **pgvector dimension locked** in migration SQL (e.g. `vector(1536)` for `text-embedding-3-small`); document in **ADR-007**. |

---

## Goals

1. **`normalize` worker handler** — reads `snapshots` by ID only; writes `normalized_entities` + `metric_facts`; no collectors.
2. **`embed` worker handler** — reads `normalized_entities` by ID; writes `embedding_vectors`; may auto-chain after normalize (ADR-008).
3. **`packages/analytics`** — engagement, niche pillars, cohort helpers.
4. **pgvector** — extension + `embedding_vectors` (C16).
5. **Contracts** — Phase 3 job I/O + Zod payloads.
6. **`npm run verify:phase-3`** — golden metrics, retrieval@3 (C15), migrations, C14 guard.
7. **CI** — Phase 0–3 gate (C13).

---

## Non-goals (out of scope)

| Area | Notes |
|------|--------|
| analyze / report handlers | Phase 4+ |
| Cockpit, Jarvis, report UI | Later phases |
| Collector features | Bugfix only |
| Re-scrape / Graph in normalize | Forbidden (C14) |
| Live embed API in CI | Mocked only (Q1) |
| Stub job types | No handler without tests |

---

## Pipeline

```
collect → normalize → embed → analyze → report
          Phase 3     Phase 3
```

### Normalize

1. Validate `NormalizeJobInput` (`snapshotId`, `schemaVersion`).
2. SELECT snapshot; parse merged payload from contracts types.
3. Run `@zeref/analytics` → engagement, niche tags, cohort hooks.
4. INSERT `normalized_entities` + `metric_facts` (with `platform_account_id`).
5. Return `NormalizeJobOutput`.
6. Optional auto-chain: enqueue or inline `embed` for new `normalizedEntityId` (ADR-008).

### Embed

1. Validate `EmbedJobInput` (`normalizedEntityId`, `model`, `schemaVersion`).
2. SELECT normalized entity only (no snapshot re-fetch for embedding text).
3. Deterministic text → mocked/OpenAI/nomic provider per Q1.
4. INSERT `embedding_vectors`.
5. Return `EmbedJobOutput`.

---

## Data model

### `metric_facts` (Q3)

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | PK |
| `snapshot_id` | uuid | FK → snapshots |
| `normalized_entity_id` | uuid | FK → normalized_entities |
| **`platform_account_id`** | uuid | FK → platform_accounts (Q3) |
| `metric_version` | text | e.g. `phase3-v1` |
| `engagement_score` | numeric | nullable if insufficient_data |
| `niche_tags` | jsonb or text[] | pillar tags |
| `insufficient_data` | boolean | |
| `facts_json` | jsonb | extensible |
| `created_at` | timestamptz | append-only |

### `embedding_vectors` (C16)

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | PK |
| `normalized_entity_id` | uuid | FK; unique per (model, metric_version) per ADR |
| `model` | text | `text-embedding-3-small` |
| `dimensions` | int | must match column |
| `embedding` | **vector(1536)** | locked in migration (C16) |
| `content_hash` | text | dedupe |
| `created_at` | timestamptz | append-only |

**Migration:** `CREATE EXTENSION IF NOT EXISTS vector;`

---

## `packages/analytics`

- `engagement.ts`, `niche.ts`, `cohort.ts`
- Golden: `fixtures/phase-3/metrics/`
- Retrieval goldens: `fixtures/phase-3/retrieval/` (C15)

---

## Contracts (C11)

- `NormalizeJobOutput`: `{ normalizedEntityId, snapshotId, metricFactId?, insufficientData?, platformAccountId? }`
- `EmbedJobInput` / `EmbedJobOutput`
- `NormalizedPostPayload`, `MetricFactsPayload` Zod
- `PHASE3_CONTRACT_VERSION` (e.g. `"3.0.0"`)

---

## Worker (C12, C14)

- Registry: `collect`, `normalize`, `embed` only.
- CLI: `scripts/enqueue-normalize.mjs`, `scripts/enqueue-embed.mjs`
- **No** `@zeref/instagram` import in normalize/embed modules (C14).

---

## Verify: `npm run verify:phase-3`

| Check | Requirement |
|-------|-------------|
| Build | `npm run build` |
| C11 | `PHASE3_CONTRACT_VERSION`, job I/O exports |
| C12 | Registry guard |
| C14 | No instagram import in normalize/embed paths |
| C15 | retrieval@3 ≥ 1.0 on `fixtures/phase-3/retrieval/` |
| Golden metrics | `fixtures/phase-3/metrics/` |
| Migrations | pgvector + tables on Postgres 16 |
| Integration | normalize + embed handler tests |
| Prior | verify:phase-0 … verify:phase-2 pass |

**CI (C13):** `verify:phase-3` after `verify:phase-2`; `DATABASE_URL`; no live embed.

---

## ADRs

| ADR | Topic |
|-----|--------|
| ADR-007 | Provider, dimensions (C16), CI mock (Q1) |
| ADR-008 | Schema + normalize→embed auto-chain (Q2) |
| ADR-009 | Normalize boundaries, no re-scrape (C14) |
| ADR-010 | verify harness, retrieval@3 (C15) |

---

## Acceptance criteria

- Q1–Q3 and C11–C16 satisfied.
- `verify:phase-0` through `verify:phase-3` green locally + CI.
- No out-of-scope features.

---

## Agent ownership

| Agent | Deliverables |
|-------|----------------|
| Data | Migrations, metric_facts + platform_account_id, embedding_vectors, ADR-007/008 |
| Analytics | `@zeref/analytics`, metrics + retrieval fixtures |
| Worker | normalize + embed, CLI, ADR-009 |
| API/Contracts | Phase 3 contracts, PHASE3_CONTRACT_VERSION |
| QA | verify-phase-3.mjs, C14/C15, CI C13, ADR-010 |
| Docs | ADR bodies, verify.md, STATE |
