# ADR-016: BFF placement — cockpit slices + report artifacts

**Status:** Accepted (Phase 5)  
**Date:** 2026-05-29  
**Owner:** API  
**Related:** [Phase 5 contract](../phase-5-contract.md) (Q2, C27, C29) · [ADR index](./README.md) · [ADR-017](./ADR-017-cockpit-routes-layout.md) · [ADR-018](./ADR-018-verify-phase-5-harness.md) · [Legacy cockpit salvage](../../handoff/legacy-ios.md) · [verify.md](../verify.md)

## Context

Phase 5 cockpit panels need **summary DTOs** for RSC pages and a **detail endpoint** for elite report JSON. The master plan allows BFF routes in either `apps/web` (Next Route Handlers) or a separate `apps/api` service.

`apps/web` ships RSC helpers (`getCockpitSlices()`) and HTTP routes under `/api/v1/`. `apps/api` is a Phase 0 stub with no HTTP server.

**Amended 2026-05-30 (Phase 5.0.2):** RSC pages call `loadCockpitSlices()` directly via `getCockpitSlices()` — no HTTP loopback to `/api/v1/cockpit/slices`. The route remains for Playwright, curl, and external clients.

**Amended 2026-06-03 (Phase 8):** BFF may enqueue jobs **only** via `POST /api/v1/jobs/enqueue` per [ADR-030](./ADR-030-bff-job-enqueue.md) (allowlist: `normalize`, `embed`, `analyze`, `report`; **`collect` excluded**). All other routes remain read-only for worker side effects.

## Decision

1. **BFF lives in `apps/web/app/api/v1/`** — Next.js 15 Route Handlers, same origin as RSC pages.
2. **Read-only Postgres** via `@zeref/db` + Drizzle; handlers **do not enqueue worker jobs** except via ADR-030 allowlisted `POST /api/v1/jobs/enqueue` (Phase 8).
3. **No `@zeref/instagram`** imports in web BFF modules (C19-style boundary).
4. **Routes**
   - `GET /api/v1/cockpit/slices` → `CockpitSlicesSchema`
   - `GET /api/v1/reports/artifacts/:id` → `EliteReportSchema` (elite kind only)
5. **Implementation modules**
   - `apps/web/lib/db.ts` — pooled `DATABASE_URL` client
   - `apps/web/lib/cockpit-bff.ts` — query + fixture logic (unit/integration tested)
   - `apps/web/lib/bff.ts` — RSC wrapper `getCockpitSlices()` → direct `loadCockpitSlices()` call
   - Route files remain thin wrappers.

### Fixture mode (CI Playwright without Postgres)

When `ZEREF_BFF_FIXTURE=1`:

| Route | Source |
|-------|--------|
| `/api/v1/cockpit/slices` | `fixtures/phase-5/cockpit-slices.fixture.json` |
| `/api/v1/reports/artifacts/:id` | `fixtures/phase-4/elite/ride-log-elite.golden.json` for artifact `550e8400-e29b-41d4-a716-446655440000` |

Override the artifact UUID in tests with `ZEREF_PLAYWRIGHT_ARTIFACT_ID` (optional; defaults to fixture ID above).

### Seeded Postgres (local / integration)

```powershell
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
node scripts/seed-cockpit-playwright.mjs
```

The seed script inserts a minimal pipeline row chain ending in an elite `report_artifacts` row. Use the printed artifact ID for Playwright `?artifact=` deep links when not using fixture mode.

### Empty / offline behavior

When `DATABASE_URL` is unset and `ZEREF_BFF_FIXTURE` is not `1`:

- **RSC pages:** `getCockpitSlices()` throws `CockpitBffError`; `app/cockpit/error.tsx` renders error UI (ZR-004).
- **HTTP route:** `/api/v1/cockpit/slices` returns **500** JSON `{ error: "failed to load cockpit slices" }`.
- **Artifact detail:** returns **404**.

## Consequences

- RSC pages call same-origin BFF; no separate API deploy in Phase 5.
- Playwright CI can run with `ZEREF_BFF_FIXTURE=1` (no DB) or against seeded Postgres.
- Future extraction to `apps/api` would require ADR amendment + proxy config.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Standalone `apps/api` HTTP server | Extra deploy/proxy; stub only today; RSC already in web |
| Full elite blobs in slices response | Violates Q2 summary-DTO contract |
| Worker enqueue from BFF (general) | Forbidden — report generation stays worker-only; **exception:** ADR-030 dedicated enqueue route with UI allowlist |

## Verification

```powershell
cd c:\Projects\zeref
$env:ZEREF_BFF_FIXTURE='1'
npm -w @zeref/web test

$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
npm -w @zeref/web test
npm run build
```

Included in `npm run verify:phase-5` (ADR-018).
