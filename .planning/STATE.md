# Zeref — STATE

**Updated:** 2026-05-28

## Current position

- **Phase:** 2 (**implementation**)
- **Last completed:** Phase 1 (planner-approved 2026-05-28; `b23f611`)
- **Blocker:** none

## Planner decisions

### Phase 1 (complete) — C1–C6

See [phase-1-contract.md](../docs/governance/phase-1-contract.md).

### Phase 2 (approved) — Q1–Q4 + C7–C10

See [phase-2-contract.md](../docs/governance/phase-2-contract.md) § Planner decisions.

| ID | Summary |
|----|---------|
| Q1 | One merged snapshot per shortcode; re-collect = new INSERT |
| Q2 | Graph: user + `/media` MVP fields only |
| Q3 | CI parse-only; Playwright fetch live-only (`ZEREF_LIVE_INSTAGRAM=1`) |
| Q4 | CLI enqueue only; no HTTP collect route |
| C7 | `CollectJobOutput` + `PHASE2_CONTRACT_VERSION` |
| C8 | content_hash dedupe in ADR-005 |
| C9 | Worker collect-only registry |
| C10 | CI runs `verify:phase-2` |

## Governance entry points

| Artifact | Path |
|----------|------|
| Phase 2 contract | `docs/governance/phase-2-contract.md` |
| Verify | `docs/governance/verify.md` |
| ADR index | `docs/governance/adr/README.md` |
| Legacy handoff | `docs/handoff/legacy-ios.md` |

## Phase 2 checklist

- [x] Planner approves `phase-2-contract.md`
- [x] Scrape — `@zeref/instagram` parse/merge/fetch; ADR-004 (confirm in verify log)
- [x] API/Contracts — CollectJob I/O, `PHASE2_CONTRACT_VERSION`, fixtures/graph (confirm in verify log)
- [x] Worker — collect handler, ADR-005, `enqueue-collect.mjs` (confirm in verify log)
- [x] QA — `verify-phase-2.mjs`, CI C10, ADR-006 (confirm in verify log)
- [x] Docs — ADR bodies finalized, `verify.md`, `legacy-ios.md` merge notes
- [ ] `npm run verify:phase-0/1/2` green (orchestrator + Planner)
- [ ] Planner sign-off Phase 2

## Agent roster (Phase 2)

| Agent | Status |
|-------|--------|
| Scrape | Report back — confirm in verify log |
| API/Contracts | Report back — confirm in verify log |
| Worker | Report back — confirm in verify log |
| QA | Report back — confirm in verify log |
| Docs | Done — ADRs, verify.md, legacy-ios |

## Session log

| When | Who | What |
|------|-----|------|
| 2026-05-28 | Planner | Phase 2 contract approved (Q1–Q4, C7–C10) |
| 2026-05-28 | Orchestrator | Published contract; emitted agent prompts |
| 2026-05-28 | Docs | ADR-004/005/006 cross-links, verify.md Phase 2, legacy-ios merge salvage |

## Do not start

- Phase 3+ until Planner signs off Phase 2

## Verify (orchestrator)

```powershell
cd c:\Projects\zeref
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
# Do not set ZEREF_LIVE_INSTAGRAM for default gate (Q3)
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
```
