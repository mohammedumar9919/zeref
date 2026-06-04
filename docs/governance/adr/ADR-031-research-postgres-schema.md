# ADR-031: Research topics + signals schema (Phase 9)

**Status:** **APPROVED** (Planner 2026-06-03)  
**Date:** 2026-06-03  
**Owner:** Data agent  
**Related:** Q1–Q2 · C81–C82 · [phase-9-contract.md](../phase-9-contract.md) · [ADR-008](./ADR-008-normalize-embed-chain.md)

---

## Context

Phase 5 Research panel is an honest placeholder (`insufficientData: true` in fixtures). Operators need persisted **research topics** and **signals** derived from existing pipeline outputs (`metric_facts`, `embedding_vectors`) without re-scraping Instagram or mutating snapshots (C6).

---

## Decision

### Tables

1. **`research_topics`**
   - `id` UUID PK
   - `title` text NOT NULL
   - `scope_entity_id` UUID NULL FK → `normalized_entities`
   - `trend_score` numeric NULL (aggregate)
   - `signal_count` integer DEFAULT 0
   - `last_computed_at` timestamptz NULL
   - `created_at`, `updated_at`

2. **`research_signals`**
   - `id` UUID PK
   - `topic_id` UUID FK → `research_topics`
   - `source_entity_id` UUID NULL FK → `normalized_entities`
   - `source_snapshot_id` UUID NULL FK → `snapshots`
   - `signal_type` text NOT NULL (e.g. `engagement_delta`, `embedding_cluster`)
   - `score` numeric NOT NULL
   - `payload_json` jsonb DEFAULT `{}`
   - `computed_at` timestamptz NOT NULL

### Contracts

`packages/contracts/src/phase9/` exports:

- `ResearchTopicSchema`, `ResearchSignalSchema`, `ResearchTopicDetailSchema`
- `CockpitSlicesSchemaV9` with additive research item fields: `signalCount`, `lastComputedAt`
- `PHASE9_CONTRACT_VERSION` = `9.0.0`

### Fixtures

`fixtures/phase-9/` — `research-topic.valid.json`, `research-signals.valid.json`, `cockpit-slices.valid.json` (`phase9-cockpit-v1`, research panel populated).

---

## Consequences

- P9-A owns migration + contracts + fixtures.
- Worker `research` job writes signals; BFF read-only for UI.
- CI uses `ZEREF_BFF_FIXTURE=1` + fixture JSON when `SKIP_DB_TESTS=1`.

---

## Verification

- `@zeref/db` migration test includes new tables.
- Contract round-trip on fixtures in `verify:phase-9`.
