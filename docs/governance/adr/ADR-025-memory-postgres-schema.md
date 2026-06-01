# ADR-025: Postgres 4-tier memory schema (Phase 7)

**Status:** **APPROVED** (Planner 2026-05-31)  
**Date:** 2026-05-31  
**Owner:** Data agent  
**Related:** Q1 · C61–C64 · [GAP ZR-030](../../GAP_BACKLOG.md)

---

## Context

Phase 7 introduces `packages/zeref-memory` with jarvis-orb–aligned tiers. Zeref already uses Postgres via `packages/db` for snapshots and reports. A second store (SQLite) would drift from pipeline truth.

---

## Decision

1. **Tables** (Drizzle migrations in `packages/db`):
   - `memory_entries` — tier, content, source, temporal_score, observation (`verified` \| `stale` \| `contradicted`)
   - `memory_entities` — type, name, state JSON, transition history
   - `memory_relations` — entity graph edges
   - `memory_observations` — contradiction/supersession metadata

2. **Temporal scoring:** 30-day half-life decay constant (configurable env `ZEREF_MEMORY_HALF_LIFE_DAYS`, default `30`).

3. **`ZEREF_MEMORY_MOCK=1`:** `@zeref/zeref-memory` uses in-memory/fixture adapter — no live DB required in CI unit tests.

4. **Package boundary:** `packages/zeref-memory` owns business logic; `packages/db` owns schema/migrations only.

---

## Consequences

- Data agent ships migrations before kernel/BFF wire live paths.
- Contracts agent ships `packages/contracts/src/phase7/` schemas.

---

## Verification

- Migration applies on dev Postgres.
- `npm test -w @zeref/zeref-memory` with mock flag green.
