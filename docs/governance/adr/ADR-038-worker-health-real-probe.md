# ADR-038: Worker-health real probe (Phase 10.5)

**Status:** **APPROVED** (Lead 2026-06-14)  
**Date:** 2026-06-14  
**Owner:** P10.5-B  
**Related:** [phase-10.5-contract.md](../phase-10.5-contract.md) C131 · [ADR-036](./ADR-036-live-ops-pipeline-truth.md) · [phase-10-contract.md](../phase-10-contract.md) C113–C115

---

## Context

Phase 10 shipped `GET /api/v1/ops/worker-health` with honest fixture mode and **`ZEREF_WORKER_AVAILABLE=1`** env signal. That closed ops discoverability but **did not prove** the worker process is consuming pg-boss (master plan #7 / N7).

Operators need a **probe**, not an env echo, before Phase 11 live agent loops.

---

## Decision

### Probe strategy (P10.5-B)

`resolveWorkerHealth()` resolution order:

1. **`ZEREF_BFF_FIXTURE=1`** → `{ consuming: false, source: "fixture" }` (CI unchanged)
2. **Real probe** (when DB available):
   - Check pg-boss **active workers** or **recent completed job** heartbeat window, **or**
   - Read **`worker_heartbeat`** / queue metadata table if present, **or**
   - Lightweight **`SELECT 1`** on pg-boss schema + subscription liveness signal
3. **Fallback** — if probe fails but env says available → `{ consuming: false, source: "probe" }` (honest, not fake-live)
4. **Env-only fallback** — only when DB unavailable (dev web-only): `{ consuming: false, source: "env" }`

### Schema

Extend `WorkerHealthResponse` if needed (Phase 10.5 contracts patch):

```json
{ "consuming": true, "source": "pg-boss-probe" }
```

Prefer reusing `source` string enum; bump `PHASE10_CONTRACT_VERSION` to `10.5.0` only if schema breaking.

### Performance

- Probe must complete **&lt; 50ms** p95 in fixture/mock CI (mock probe path)
- **No sync probe** on SSE handler — health is separate GET route (C124 carry-forward)

---

## Consequences

- P10.5-B updates `worker-health.ts` + optional contracts fixture
- `verify:phase-10` must stay green; `verify:phase-10.5` adds probe unit tests
- Calendar enqueue UX (Amendment J) may use probe result for warnings

---

## Alternatives rejected

| Option | Why rejected |
|--------|--------------|
| Always trust `ZEREF_WORKER_AVAILABLE` | Lies when worker crashed but env stale |
| HTTP ping worker daemon | New port/process contract; out of scope |
| Fake `consuming: true` when env set | Violates Phase 10 honesty |
