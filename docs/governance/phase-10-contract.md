# Zeref — Phase 10 Contract (Implementation)

**Phase:** 10  
**Status:** **APPROVED** (Planner 2026-06-10)  
**Theme:** Live Ops & Pipeline Truth — runnable pipeline in normal dev, honest worker/pipeline signals

**Prerequisites:** Phase 9 **APPROVED** @ `9960c92`; P8 hotfix **CLOSED** @ `e7908d1` (`verify:hotfix-p8` green on `main`).

**References:** [phase-5.0.1-contract.md](./phase-5.0.1-contract.md) · [phase-8-contract.md](./phase-8-contract.md) Amendment J · [DEV_PERFORMANCE.md](../DEV_PERFORMANCE.md) · [ADR-036](./adr/ADR-036-live-ops-pipeline-truth.md)

**Gap backlog:** ZR-013 backend (real pipeline SSE when worker present); CURRENT_STATE ops discoverability (no queue consumer in normal dev)

---

## Planner decisions (binding)

| # | Decision |
|---|----------|
| **Q1** | **APPROVED** — **`dev:stack`** is the default local entry: db + worker + web with **`ZEREF_WORKER_AVAILABLE=1`** on web child env. `npm run dev` alone = web-only (no queue consumer). |
| **Q2** | **APPROVED** — **`GET /api/v1/ops/worker-health`** returns honest `{ consuming, source }`; no fake “live” when worker absent. |
| **Q3** | **APPROVED** — Pipeline SSE uses existing **`cockpit_sse_outbox`** drain; events carry honest **`simulated`** flag (real drain → `simulated: false`). |
| **Q4** | **APPROVED** — **`npm run verify:phase-10`** chains `verify:hotfix-p8` → `verify:phase-9`; Playwright `cockpit-ops-10.spec.ts` with `ZEREF_PHASE10_OPS=1`. |
| **Q5** | **APPROVED** — CI step after Verify P8 hotfix; Phase 0–9 + hotfix gates must remain green. |

### Conditions (C111–C124)

| ID | Condition |
|----|-----------|
| **C111** | **`scripts/dev-stack.mjs`** passes **`ZEREF_WORKER_AVAILABLE=1`** to web child process env when worker is started alongside web. |
| **C112** | **Docs** — `dev:stack` documented as default local ops entry; `npm run dev` alone documented as web-only (no pg-boss consumer). |
| **C113** | **BFF** — `GET /api/v1/ops/worker-health` returns `{ consuming: boolean, source: string }`. |
| **C114** | **`packages/contracts/src/phase10/`** — `WorkerHealthResponseSchema`, `PHASE10_CONTRACT_VERSION` = `10.0.0`. |
| **C115** | **Fixture** — `fixtures/phase-10/worker-health.valid.json` round-trips schema. |
| **C116** | **Pipeline honesty** — `drainCockpitOutboxOnce` (or equivalent) emits pipeline SSE with **`simulated: false`** when sourced from real outbox drain. |
| **C117** | **Worker absent** — when worker unavailable, pipeline telemetry remains **simulated only**; no non-simulated pipeline events (unit test enforced). |
| **C118** | **`scripts/verify-phase-10.mjs`** chains **`verify:hotfix-p8`** then **`verify:phase-9`** (does not replace either gate). |
| **C119** | **Playwright** — `cockpit-ops-10.spec.ts` with `ZEREF_PHASE10_OPS=1`; asserts worker-health reachable + honest fixture response. |
| **C120** | **CI** — Verify Phase 10 step after Verify P8 hotfix; env documented in [verify.md](./verify.md). |
| **C121** | **Operator UAT** — perf / instant-feel testing uses **`next build && next start`**; dev cold compile latency is not prod SLA ([DEV_PERFORMANCE.md](../DEV_PERFORMANCE.md) § Operator UAT). |
| **C122** | **Perf smoke (optional P10-D)** — advisory `scripts/perf-smoke.mjs` documents warm `next start` timing budget; non-blocking gate. |
| **C123** | **Honest badges** — no fake-live pipeline or worker indicators when `consuming: false` (Amendment J carry-forward). |
| **C124** | **Async drain only** — outbox poll/drain stays async background path; **no synchronous DB on HTTP request handlers** for pipeline SSE. |

**CI env (binding):** Phase 9 + hotfix flags + **`ZEREF_PHASE10_OPS=1`**

---

## Amendment P — Phase 10 file firewall

### P10-A (Ops)

- `scripts/dev-stack.mjs`, root `package.json` (scripts only)
- `docs/DEV_PERFORMANCE.md`, `docs/CI_SETUP.md`, `docs/CURRENT_STATE.md` (ops section only)

**Forbidden:** `apps/web/**`, `packages/**`, `apps/worker/**`

### P10-B (BFF)

- `apps/web/lib/ops/**`
- `apps/web/app/api/v1/ops/worker-health/**`
- `packages/contracts/src/phase10/**`, `fixtures/phase-10/**`
- `apps/web/lib/cockpit/simulated-pipeline.ts` (honesty wiring only)
- `apps/web/test/**` (ops unit tests)

**Forbidden:** `apps/web/components/hud/**`, `apps/worker/**`, `scripts/**`

### P10-E (QA)

- `scripts/verify-phase-10.mjs`, `apps/web/e2e/cockpit-ops-10.spec.ts`
- `package.json` (script), `.github/workflows/ci.yml`, `docs/governance/verify.md`
- Optional P10-D: `scripts/perf-smoke.mjs`

**Forbidden:** `apps/web/components/**`, `apps/web/app/**` (except e2e), `packages/**`

---

## Amendment Q — Phase 6.2 parallel track

| Track | Timing | Rule |
|-------|--------|------|
| **P6.2-A** workspace shell | **MAY** run parallel with P10 Wave 1 | Strict UI firewall per [phase-6.2-contract.md](./phase-6.2-contract.md) Amendment O |
| **P6.2-B** globe pulse | **AFTER** Phase 10 functional sign-off | No WebGL internals |

Phase 6.2-A addresses slow panel navigation (architecture); Phase 10 addresses ops truth.

---

## Spawn waves (binding)

| Wave | Slices | Gate |
|------|--------|------|
| **1** | **P10-A** ∥ **P10-B** | Manual smoke + unit tests |
| **2** | **P10-E** (+ optional **P10-D**) | `verify:phase-10` green |

---

## Non-goals (binding)

- Phase 11 auth
- ZR-005 CI live Postgres BFF
- Phase 8.1 cron / scheduled jobs
- Amendment K — `GET /api/v1/calendar/events/:id`
- New worker job types
- Instagram collect from UI
- Fake live telemetry when worker absent

---

## Exit gate

1. `npm run verify:phase-10` green on `main`
2. CI Phase 0–10 + hotfix gates green
3. Lead updates `CURRENT_STATE.md` — Phase 10 **APPROVED**
4. Planner functional sign-off
