# ADR-006: Instagram parse vs fetch vs live (Phase 2 verify harness)

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** QA agent  
**Phase:** 2  
**Related:** [Phase 2 contract](../phase-2-contract.md) (Q3, C10) · [ADR index](./README.md) · [ADR-004](./ADR-004-instagram-merge.md) · [ADR-005](./ADR-005-worker-collect.md) · [verify.md](../verify.md)

## Context

Phase 2 introduces `@zeref/instagram` with three collection paths:

| Module | Role | CI default |
|--------|------|------------|
| **parse** | Pure functions on frozen HTML (`fixtures/phase-2/html/`) | **Yes** |
| **graph** | Graph API client; tests use `fixtures/phase-2/graph/` mocks | **Yes** |
| **merge** | `mergeByShortcode` — one payload per shortcode (Q1) | **Yes** |
| **fetch** | Playwright live page fetch | **No** |

Planner **Q3** requires CI to avoid browser launch. Playwright remains available for local debugging only.

## Decision

### Default verify path (`npm run verify:phase-2`)

1. **No Playwright execution** — `verify-phase-2.mjs` clears `ZEREF_LIVE_INSTAGRAM` from the child process environment so live fetch tests stay skipped.
2. **Fixture-only coverage:**
   - `fixtures/phase-2/html/` → parse smoke (`@zeref/instagram` parse + integration tests)
   - `fixtures/phase-2/graph/` → Graph mock round-trips (`@zeref/contracts` + `@zeref/instagram` graph tests)
   - merge-by-shortcode unit tests
3. **Contracts (C7):** `PHASE2_CONTRACT_VERSION`, `CollectJobOutput`, merged payload Zod round-trips.
4. **Worker (optional DB):** `@zeref/worker` collect integration test INSERTs a snapshot when `DATABASE_URL` points at Postgres 16; skipped with `SKIP_DB_TESTS=1`.

### Live path (local only)

| Env | Behavior |
|-----|----------|
| `ZEREF_LIVE_INSTAGRAM=1` | Enables `fetchPostPage` live smoke in `@zeref/instagram/test/fetch.test.mjs` |
| unset / other | `fetchPostPage` throws; live test skipped |

Live fetch is **never** set in `.github/workflows/ci.yml` (C10).

### CI ordering (C10)

After `verify:phase-1`:

```yaml
- run: npm run verify:phase-2
  env:
    DATABASE_URL: postgres://zeref:zeref@localhost:5432/zeref
```

No `ZEREF_LIVE_INSTAGRAM`.

## Consequences

- CI is deterministic and does not require Playwright browsers or Instagram network access.
- Developers run `ZEREF_LIVE_INSTAGRAM=1 npm -w @zeref/instagram test` locally to validate fetch when needed.
- `verify:phase-2` remains the single Phase 2 gate; it delegates to workspace tests rather than duplicating parse/merge logic.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Playwright in CI with cached browsers | Violates Q3; flaky, slow, blocked by Instagram |
| Skip fetch module entirely | Live path needed for local collector validation |
| Mock Playwright in CI | Adds complexity; parse fixtures already cover HTML path |

## Verification

```powershell
cd c:\Projects\zeref
# CI-safe default (Q3 — ZEREF_LIVE_INSTAGRAM unset)
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2

# Optional local live fetch only
$env:ZEREF_LIVE_INSTAGRAM='1'
npm -w @zeref/instagram test
```

`verify-phase-2.mjs` deletes `ZEREF_LIVE_INSTAGRAM` from the child env so CI and default local runs stay fixture-only.
