# ADR-009: Worker normalize/embed boundaries (C14)

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** Worker agent  
**Phase:** 3  
**Related:** [Phase 3 contract](../phase-3-contract.md) (C12, C14) · [ADR index](./README.md) · [ADR-005](./ADR-005-worker-collect.md) · [ADR-008](./ADR-008-normalize-embed-chain.md) · [ADR-010](./ADR-010-verify-phase-3-harness.md) · [verify.md](../verify.md)

## Context

Phase 3 adds `normalize` and `embed` handlers. The pipeline rule is **IDs only downstream of collect** — normalize must not re-scrape Instagram or call Graph. Planner **C14** forbids `@zeref/instagram` imports in normalize/embed modules; `verify:phase-3` enforces via static guard.

## Decision

### Module boundaries (C14)

| Module | May import | Must not import |
|--------|------------|-----------------|
| `jobs/collect.ts`, `lib/collect-pipeline.ts` | `@zeref/instagram` | — |
| `jobs/normalize.ts`, `lib/normalize-payload.ts`, `lib/embed-*.ts` | `@zeref/contracts`, `@zeref/analytics`, `@zeref/db` | `@zeref/instagram` |

Normalize reads **`snapshots.payload_json`** only, parsed with `MergedInstagramPostPayloadSchema` from contracts (already validated at collect). Analytics runs on that in-memory shape.

Embed reads **`normalized_entities.payload_json`** only (`NormalizedPostPayloadSchema`). It does **not** SELECT from `snapshots` for embedding text (ADR-008).

### No re-scrape / no collectors

- No Playwright, HTML parse, or Graph client in normalize/embed paths.
- No new snapshot INSERT/UPDATE from normalize/embed.
- Bugfixes to collect remain in collect modules only.

### Worker registry (C12)

`WORKER_JOB_NAMES`: `collect`, `normalize`, `embed` — **no** `analyze` or `report`.

### Auto-chain (ADR-008)

After successful `normalize`, the worker **may** call `runEmbed` inline when `ZEREF_AUTO_EMBED !== '0'` (default enabled). Explicit `scripts/enqueue-embed.mjs` remains for retries and tests (`autoEmbed: false` in handler deps).

### Metric facts without account

If `snapshots.platform_account_id` is NULL, normalize still INSERTs `normalized_entities` but **skips** `metric_facts` and sets `insufficientData: true` on output (ADR-008).

### C14 guard paths (enforced by `verify-phase-3.mjs`)

- `apps/worker/src/jobs/normalize.ts`
- `apps/worker/src/jobs/embed.ts`
- `apps/worker/src/lib/normalize-payload.ts`
- `apps/worker/src/lib/embed-text.ts`
- `apps/worker/src/lib/embed-provider.ts`
- `apps/worker/src/lib/auto-embed.ts`

Static grep rejects `from "@zeref/instagram"`, dynamic `import("@zeref/instagram")`, and `require("@zeref/instagram")`.

## Consequences

- `verify:phase-3` greps `apps/worker/src/jobs/normalize.ts` and embed paths for `@zeref/instagram`.
- Integration tests seed snapshots directly; no live Instagram in worker Phase 3 tests.
- Analyze/report agents must continue ID-only reads in Phase 4+.

## Verification

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
npm run build
npm -w @zeref/worker test
```

C14 grep and C12 registry checks run in `npm run verify:phase-3`.
