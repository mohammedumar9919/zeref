# ADR-010: Phase 3 verify harness (C13–C15)

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** QA agent  
**Phase:** 3  
**Related:** [Phase 3 contract](../phase-3-contract.md) (C13–C15) · [ADR index](./README.md) · [ADR-007](./ADR-007-embedding-provider.md) · [ADR-009](./ADR-009-worker-normalize-boundaries.md) · [verify.md](../verify.md)

## Context

Phase 3 adds normalize + embed handlers, pgvector, golden metrics, and retrieval@3 goldens. CI must gate regressions without live embed APIs (Q1) or Instagram re-scrape (C14).

## Decision

### Entry point

`npm run verify:phase-3` → `scripts/verify-phase-3.mjs`

Runs **after** `verify:phase-2` in CI (C13). Does not re-run prior phase scripts; orchestrator runs the full 0–3 gate locally.

### Child process environment

`verify-phase-3.mjs` strips live-only env before spawning workspace tests:

| Variable | CI / default verify |
|----------|---------------------|
| `ZEREF_LIVE_INSTAGRAM` | **removed** |
| `ZEREF_EMBED_PROVIDER` | forced to **`mock`** |
| `OPENAI_API_KEY` | **removed** |
| `ZEREF_NOMIC_EMBED_URL` | **removed** |

`DATABASE_URL` is passed through for migration and handler integration tests.

### Static checks (script-owned)

| Check | Requirement |
|-------|-------------|
| Governance | `phase-3-contract.md`, ADR-007/008/009/010 |
| Fixtures | `fixtures/phase-3/` job I/O, `metrics/`, `retrieval/` |
| **C14** | Grep guard: no `@zeref/instagram` in normalize/embed worker modules (ADR-009 list) |
| **C16** | Migration SQL contains `vector` extension + `vector(1536)` |
| **C11** | Built `@zeref/contracts` exports `PHASE3_CONTRACT_VERSION`, normalize/embed job I/O schemas |
| **C12** | Worker registry exactly `collect`, `normalize`, `embed` |

Dynamic imports use `pathToFileURL` for Windows ESM compatibility.

### Delegated workspace tests

| Package | Covers |
|---------|--------|
| `@zeref/contracts` | Phase 3 fixture round-trips (C11) |
| `@zeref/analytics` | Golden metrics + **retrieval@3 ≥ 1.0** on `fixtures/phase-3/retrieval/` (C15) |
| `@zeref/db` | Phase 1–3 migrations, pgvector, append-only, FK integrity |
| `@zeref/worker` | normalize + embed handler integration (INSERT paths, auto-embed policy) |

### CI (C13)

Job **Phase 0–3 gate**:

1. Postgres **16 with pgvector** (`pgvector/pgvector:pg16`) — required for `CREATE EXTENSION vector`
2. `DATABASE_URL=postgres://zeref:zeref@localhost:5432/zeref`
3. `npm run verify:phase-3` after `verify:phase-2`
4. No live embed or Instagram env vars

### Local live embed (optional)

```powershell
$env:ZEREF_EMBED_PROVIDER='openai'
$env:OPENAI_API_KEY='...'
npm -w @zeref/worker test
```

Not part of default verify or CI.

## Consequences

- C15 enforcement lives in `@zeref/analytics/test/phase-3.test.mjs`; verify script asserts retrieval fixtures exist then runs the package tests.
- C14 is enforced twice: static grep in verify script + architectural rule in ADR-009.
- Phase 2 verify still expects collect-only registry; Phase 3 verify supersedes registry check for current tip.

## Verification

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
npm run verify:phase-3
```
