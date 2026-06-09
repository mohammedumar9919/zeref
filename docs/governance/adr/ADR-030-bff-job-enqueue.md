# ADR-030: BFF job enqueue allowlist (Phase 8)

**Status:** **APPROVED** (Planner 2026-06-03)  
**Date:** 2026-06-03  
**Owner:** BFF agent  
**Related:** Q3 · C74 · C79 · Amendments F, H, I, J · [ADR-016](./ADR-016-bff-cockpit-slices.md) · [GAP ZR-044](../../GAP_BACKLOG.md)

---

## Context

Pipeline jobs are enqueued today via CLI scripts only (ZR-044). Phase 8 cockpit needs allowlisted enqueue from BFF. ADR-016 L19 forbade worker enqueue from BFF — this ADR **amends** that for one route only.

---

## Decision

### Amendment to ADR-016

BFF **may** enqueue jobs **only** via `POST /api/v1/jobs/enqueue`. All other BFF routes remain read-only for worker side effects. Still **no** `@zeref/instagram` in `apps/web`.

### Amendment F — UI allowlist

**Allowed job types:** `normalize` | `embed` | `analyze` | `report`

**Excluded:** `collect` — operator CLI `scripts/enqueue-collect.mjs` only (live Instagram credentials).

### Shared helper (Amendment I)

`apps/web/lib/jobs/enqueue-job.ts`:

- Zod-validated body `{ jobType, snapshotId?, entityId?, calendarEventId? }`
- `boss.send` matching CLI retry options
- `ZEREF_JOB_ENQUEUE_MOCK=1` → `{ jobId, mocked: true }`

### Honest UX (Amendment J)

When pg-boss accepts job but worker daemon not running:

- **202** `{ jobId, queued: true, workerConsuming: false }`
- UI shows warning (failures-checklist ZR-001)

---

## Consequences

- P8-B implements route + helper; UI never imports pg-boss.
- verify:phase-8 tests mock enqueue in CI.

---

## Verification

- Route test: `collect` rejected with 400.
- Mock mode: no live boss connection in CI.
