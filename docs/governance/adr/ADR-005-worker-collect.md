# ADR-005: Worker collect job (pg-boss + C8 dedupe)

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** Worker agent  
**Phase:** 2  
**Related:** [Phase 2 contract](../phase-2-contract.md) (C8, C9, Q1, Q4) · [ADR index](./README.md) · [ADR-004](./ADR-004-instagram-merge.md) · [ADR-006](./ADR-006-parse-fetch-live.md) · [verify.md](../verify.md)

## Context

Phase 2 introduces the first executable pipeline stage: **collect**. The worker must enqueue and process jobs via **pg-boss**, persist immutable rows in `snapshots` (C6), and expose a CLI enqueue path (Q4) without HTTP routes.

Planner **C9** limits the worker registry to **`collect` only** — no normalize/analyze/report handlers in Phase 2.

Planner **C8** requires a documented policy when the same `content_hash`, `platform_account_id`, and `kind` already exist.

## Decision

### pg-boss registration (C9)

- Job name: `collect` (`COLLECT_JOB_NAME`).
- `WORKER_JOB_NAMES` contains **only** `collect`.
- `startWorker` / `registerCollectWorker` wire a single handler; other job types are forbidden in this package until a later phase.

### Collect handler flow

1. Parse and validate `CollectJobInput` (`CollectJobInputSchema`).
2. Call `@zeref/instagram`:
   - **scrape** — fixture HTML in CI/tests, or Playwright when `ZEREF_LIVE_INSTAGRAM=1`.
   - **graph** — Graph API with `INSTAGRAM_ACCESS_TOKEN`, or injected `graphFetch` in tests.
3. `mergeByShortcode` for `instagram_post_raw` (Q1 / ADR-004).
4. `computeContentHash` on canonical JSON of `payload_json`.
5. **INSERT** one snapshot per merged shortcode (never UPDATE payload).
6. Return `CollectJobOutput` `{ snapshotId, contentHash, shortcode? }` (C7).

### C8 dedupe policy

When an INSERT would duplicate an existing row matching:

- `content_hash`
- `platform`
- `kind`
- `platform_account_id` (including both NULL)

the handler **does not INSERT** and instead **returns the existing `snapshotId`** with the same `contentHash`. This makes collect jobs idempotent for identical payloads while preserving immutability (no UPDATE).

Re-collect with **changed** payload produces a **new** hash → **new INSERT** (new snapshot id), per Q1.

### Enqueue surface (Q4)

- `scripts/enqueue-collect.mjs` sends a job to pg-boss (`collect` queue).
- No HTTP route in `apps/api` for Phase 2.

### Error handling

| Failure | Behavior |
|---------|----------|
| Invalid job JSON / Zod validation | Job fails; pg-boss retries per queue config |
| Missing scrape fixture / token | Fail fast with explicit error |
| Empty merge for requested shortcodes | Fail fast |
| DB constraint / connection errors | Propagate; pg-boss retry |

## Consequences

- Integration tests call `runCollect` directly and assert C6 immutability on inserted rows.
- Downstream phases enqueue normalize only after collect returns stable snapshot IDs.
- Idempotent re-enqueue of identical collect input is safe for ops scripts.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| No-op without `snapshotId` in output | Callers cannot chain pipeline by ID |
| UPDATE on dedupe match | Violates C6 |
| Register all pipeline job types early | Violates C9; untested stubs |

## Verification

```powershell
cd c:\Projects\zeref
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
docker compose up -d db
npm run build
npm -w @zeref/worker test
# scripts/enqueue-collect.mjs — manual enqueue (Q4)
```

Worker registry collect-only assertion runs in `npm run verify:phase-2`.
