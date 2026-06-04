# ADR-032: Research worker job + BFF routes (Phase 9)

**Status:** **APPROVED** (Planner 2026-06-03)  
**Date:** 2026-06-03  
**Owner:** Worker + BFF agents  
**Related:** Q1 · Q3–Q5 · C83–C86 · C90 · Amendment L · [ADR-031](./ADR-031-research-postgres-schema.md) · [ADR-030](./ADR-030-bff-job-enqueue.md)

---

## Context

Research trends must be computed server-side from existing analytics data and exposed to the cockpit via BFF. UI must not import worker packages or call Instagram.

---

## Decision

### Worker job `research`

- Register in worker registry (extends Phase 4 five-job set).
- Input: `{ topicId?: string }` — optional scope to one topic.
- Reads `metric_facts` + `embedding_vectors`; writes `research_signals`; updates topic aggregates (`trend_score`, `signal_count`, `last_computed_at`).
- **No** `@zeref/instagram` imports (C89 / C30 guard).
- **No** snapshot table UPDATE/DELETE.

### BFF routes

| Route | Owner |
|-------|-------|
| `GET /api/v1/research/topics` | P9-B |
| `GET /api/v1/research/topics/:id` | P9-B |
| `POST /api/v1/research/topics` | P9-B |
| `GET /api/v1/cockpit/slices` → `phase9-cockpit-v1` | P9-B |

Implement `apps/web/lib/research-bff.ts` mirroring `studio-bff.ts` / `calendar-bff.ts` fixture + DB paths.

### Enqueue (Amendment L)

Extend ADR-030 allowlist with **`research`**. UI triggers recompute via `POST /api/v1/jobs/enqueue` — same honest worker-absent UX (Amendment J).

### UI (P9-C)

- `/cockpit/research` — `data-testid="research-hub"`
- `/cockpit/research/[topicId]` — detail view
- `ResearchPanel` links to hub; remove placeholder copy when fixture has topics

---

## Consequences

- P9-A implements worker handler + job I/O schemas.
- P9-B implements BFF + route tests (`apps/web/test/phase-9-routes.test.mjs`).
- P9-E adds `verify:phase-9` + `cockpit-research-9.spec.ts`.

---

## Verification

- Worker unit test: research handler with fixture DB or mock adapter.
- BFF route tests in fixture mode.
- `verify:phase-9` chains 0–8 with `ZEREF_PHASE9_RESEARCH=1`.
