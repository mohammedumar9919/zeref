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

## Phase 2 checklist

- [x] Planner approves `phase-2-contract.md`
- [ ] Scrape agent — `@zeref/instagram` parse/merge/fetch
- [ ] API/Contracts — CollectJob I/O, fixtures/graph
- [ ] Worker — collect handler, ADR-005
- [ ] QA — `verify:phase-2`, CI (C10)
- [ ] Docs — ADRs, verify.md, legacy-ios
- [ ] `npm run verify:phase-0/1/2` green
- [ ] Planner sign-off Phase 2

## Agent roster (Phase 2)

| Agent | Status |
|-------|--------|
| Scrape | Spawned — await report |
| API/Contracts | Spawned — await report |
| Worker | Spawned — await report |
| QA | Spawned — await report |
| Docs | Spawned — await report |

## Session log

| When | Who | What |
|------|-----|------|
| 2026-05-28 | Planner | Phase 2 contract approved (Q1–Q4, C7–C10) |
| 2026-05-28 | Orchestrator | Published contract; emitted agent prompts |

## Do not start

- Phase 3+ until Planner signs off Phase 2

## Verify (orchestrator)

```powershell
cd c:\Projects\zeref
$env:DATABASE_URL='postgres://zeref:zeref@localhost:35432/zeref'
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
```
