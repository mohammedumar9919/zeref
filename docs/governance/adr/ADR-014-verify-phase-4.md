# ADR-014: verify:phase-4 harness

**Status:** Accepted (Phase 4)

## Context

Each phase ships `npm run verify:phase-N` in the same wave as implementation (C21).

## Decision

`scripts/verify-phase-4.mjs` checks:

- Phase 4 contract + ADR-011–014
- `PHASE4_CONTRACT_VERSION` and job I/O exports (C17)
- Worker registry exactly five jobs (C18)
- C19 instagram import guard on analyze/report/reports paths
- Golden elite fixture + package tests (C20)
- `ZEREF_LLM_MOCK=1` for child test processes
- Prior phases via orchestrator running verify:phase-0 … 3 first

**C22:** `verify:phase-3` only requires collect+normalize+embed present (not exactly three jobs).

## Consequences

- CI job renamed **Phase 0–4 gate**; runs `verify:phase-4` after phase-3.
