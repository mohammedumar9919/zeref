# Zeref — STATE

**Updated:** 2026-05-29

## Current position

- **Phase:** 3 (**implementation**)
- **Last completed:** Phase 2 (planner-approved; `90f60ac`)
- **Blocker:** none

## Planner decisions — Phase 3

See [phase-3-contract.md](../docs/governance/phase-3-contract.md) § Planner decisions.

| ID | Summary |
|----|---------|
| Q1 | OpenAI `text-embedding-3-small`; CI mocked; nomic local only (ADR-007) |
| Q2 | Two jobs normalize + embed; auto-chain OK (ADR-008) |
| Q3 | `metric_facts` + `platform_account_id` FK (ADR-008) |
| C11 | `PHASE3_CONTRACT_VERSION` + job I/O |
| C12 | Registry: collect, normalize, embed only (ADR-009) |
| C13 | CI `verify:phase-3` (ADR-010) |
| C14 | No `@zeref/instagram` in normalize/embed (ADR-009) |
| C15 | retrieval@3 ≥ 1.0 on `fixtures/phase-3/retrieval/` (ADR-010) |
| C16 | pgvector `vector(1536)` locked (ADR-007) |

## Governance entry points

| Artifact | Path |
|----------|------|
| Phase 3 contract | `docs/governance/phase-3-contract.md` |
| Verify | `docs/governance/verify.md` |
| ADR index | `docs/governance/adr/README.md` |
| ADR-007–010 | `docs/governance/adr/ADR-007-embedding-provider.md` … `ADR-010-verify-phase-3-harness.md` |

## Phase 3 checklist

- [x] Planner approves contract
- [x] Data — migrations + ADR-007/008 (confirm in verify log)
- [x] Analytics — `@zeref/analytics` + fixtures (confirm in verify log)
- [x] Worker — normalize + embed + CLI (confirm in verify log)
- [x] API/Contracts — `PHASE3_CONTRACT_VERSION` + schemas (confirm in verify log)
- [x] QA — `verify-phase-3.mjs` + CI C13 (confirm in verify log)
- [x] Docs — ADR-007–010, `verify.md`, STATE
- [ ] `npm run verify:phase-0/1/2/3` green (orchestrator + Planner)
- [ ] Planner sign-off Phase 3

## Agent roster (Phase 3)

| Agent | Status |
|-------|--------|
| Data | Report back — confirm in verify log |
| Analytics | Report back — confirm in verify log |
| Worker | Report back — confirm in verify log |
| API/Contracts | Report back — confirm in verify log |
| QA | Report back — confirm in verify log |
| Docs | Done — ADR-007–010, verify.md, STATE |

## Session log

| When | Who | What |
|------|-----|------|
| 2026-05-29 | Planner | Phase 3 contract approved (Q1–Q3, C11–C16) |
| 2026-05-29 | Docs | Finalized ADR-007–010 cross-links, verify.md Phase 3, STATE checklist |

## Do not start

- Phase 4+ until Planner signs off Phase 3

## Verify (orchestrator)

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
# Do not set ZEREF_LIVE_INSTAGRAM or live embed env (Q1/Q3)
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
npm run verify:phase-3
```

See [verify.md](../docs/governance/verify.md).
