# Phase 5.0.1 contract — Ops and BFF honesty

**Status:** APPROVED (Planner, 2026-05-30)  
**Depends on:** Phase 5 signed off (implementation)  
**Blocks:** Phase 5.1 Luke HUD (recommended)

---

## Goal

Make the pipeline **runnable from dev** and the cockpit **honest on failure** — without changing Phase 5 visual scope.

---

## Q1 — Worker daemon

| Decision | Choice |
|----------|--------|
| Consumer | `scripts/worker.mjs` calls `startWorker()` from `@zeref/worker` |
| npm scripts | Root `dev:worker`; worker package `start` alias |
| Lifecycle | SIGINT graceful stop |

## Q2 — Dev stack

| Script | Behavior |
|--------|----------|
| `dev:stack` | docker compose db + worker + `next dev` |
| `dev:clean` | Remove `apps/web/.next` caches |
| `pipeline:run` | Inline fixture pipeline collect→report |

## Q3 — BFF error surfacing (ZR-004)

| Decision | Choice |
|----------|--------|
| RSC fetch | `getCockpitSlices()` throws `CockpitBffError` on failure |
| UI | `app/cockpit/error.tsx` with `data-testid="cockpit-load-error"` |
| Route handler | Still returns HTTP 500 JSON (unchanged) |
| DB BFF | `loadCockpitSlicesFromDb` throws if no DATABASE_URL |

---

## Acceptance (C31–C34)

| ID | Criterion |
|----|-----------|
| C31 | `npm run dev:worker` registers all 5 job handlers |
| C32 | `npm run pipeline:run` completes with JSON summary (Postgres + migrations) |
| C33 | `getCockpitSlices` test proves throw on HTTP 500 (no silent empty) |
| C34 | `dev:clean`, `dev:stack`, `phase_gate.ps1` documented in CI_SETUP |

---

## Verify

```powershell
npm run build
npm run lint
npm -w @zeref/web test
npm run verify:phase-0
npm run verify:phase-5
```

Optional local ops smoke:

```powershell
docker compose up -d db
npm run pipeline:run
npm run dev:worker   # separate terminal
node scripts/enqueue-collect.mjs
```

---

## Out of scope

- Luke HUD visual (5.1)
- SSE telemetry
- HTTP job enqueue from UI
- CI live DB BFF (ZR-005 — 5.1 QA)

---

## Multi-agent implementation

| Agent | Scope |
|-------|--------|
| Worker | `scripts/worker.mjs`, `run-pipeline.mjs`, worker package.json |
| QA | `dev-clean`, `dev-stack`, `phase_gate`, root package.json |
| BFF | `bff.ts`, `cockpit-bff.ts`, `cockpit/error.tsx`, bff-fetch test |

Lead outputs task cards → **STOP**. (Implemented in single Planner session 2026-05-30.)
