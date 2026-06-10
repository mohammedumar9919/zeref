# ADR-036: Live ops & pipeline truth (Phase 10)

**Status:** **APPROVED** (Planner 2026-06-10)  
**Date:** 2026-06-10  
**Owner:** Ops + BFF agents  
**Related:** [phase-10-contract.md](../phase-10-contract.md) C111–C124 · [phase-8-contract.md](../phase-8-contract.md) Amendment J · [ADR-027](./ADR-027-sse-brain-events-outbox.md) · [DEV_PERFORMANCE.md](../../DEV_PERFORMANCE.md)

---

## Context

Phases 0–9 shipped a full collect → report pipeline, cockpit SSE stubs, and research/studio/calendar product surfaces. **Normal dev** often runs web-only (`npm run dev`) with **no pg-boss consumer**, so:

- Jobs enqueue but nothing drains the queue
- Pipeline telemetry remains simulated (ZR-013 partial)
- Operators cannot tell if the worker is actually running

Phase 10 closes the **ops discoverability** gap without faking live signals.

---

## Decision

### Dev stack default (Q1, C111–C112)

| Command | Behavior |
|---------|----------|
| `npm run dev:stack` | docker db + worker + web; web gets **`ZEREF_WORKER_AVAILABLE=1`** |
| `npm run dev` (web only) | No queue consumer — documented honestly |

Optional: root `dev` script aliases to `dev:stack` if non-breaking for existing docs.

### Worker health endpoint (Q2, C113–C115)

`GET /api/v1/ops/worker-health`:

```json
{ "consuming": true, "source": "pg-boss" }
```

Fixture mode (`ZEREF_BFF_FIXTURE=1`) returns `consuming: false` honestly.

Schema: `@zeref/contracts` phase10 `WorkerHealthResponseSchema`.

### Pipeline SSE honesty (Q3, C116–C117, C124)

- Reuse **`cockpit_sse_outbox`** drain ([outbox-drain.ts](../../apps/web/lib/cockpit/outbox-drain.ts))
- Real drain events: **`simulated: false`**
- Worker absent: **`simulated-pipeline.ts`** only — unit test C117
- Drain runs **async** — never block HTTP handlers on DB poll (C124)

### Verify gate (Q4–Q5, C118–C120)

`verify:phase-10` chains **`verify:hotfix-p8`** → **`verify:phase-9`** then Phase 10 contract/fixture/ops e2e checks.

CI: new step **after** Verify P8 hotfix.

### Performance addendum (C121–C122)

- Operator UAT for “instant feel” uses **`next build && next start`**
- Dev cold compile (~20–30s first `/cockpit`) is expected, not a Phase 10 regression
- Optional P10-D `perf-smoke.mjs` — advisory warm-start budget only

---

## Consequences

- P10-A owns dev-stack + docs only
- P10-B owns health route + pipeline honesty wiring + contracts
- P10-E owns verify script + CI — no product UI in Phase 10
- Phase 6.2-A may run parallel (Amendment Q); main nav speed is 6.2 scope, not P10

---

## Alternatives rejected

| Option | Why rejected |
|--------|--------------|
| Always simulate pipeline in dev | Violates ZR-013; hides broken worker |
| Sync outbox read on every SSE connect | Violates C124; hurts latency |
| New worker job types in P10 | Out of theme; use existing six jobs |
