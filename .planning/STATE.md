# Zeref — STATE

**Updated:** 2026-05-29

## Current position

- **Phase:** 3 (**implementation**)
- **Last completed:** Phase 2 (planner-approved; `90f60ac`)
- **Blocker:** none

## Planner decisions — Phase 3

| ID | Summary |
|----|---------|
| Q1 | OpenAI text-embedding-3-small; CI mocked; nomic local only |
| Q2 | Two jobs normalize + embed; auto-chain OK (ADR-008) |
| Q3 | metric_facts + platform_account_id FK |
| C11 | PHASE3_CONTRACT_VERSION + job I/O |
| C12 | Registry: collect, normalize, embed only |
| C13 | CI verify:phase-3 |
| C14 | No @zeref/instagram in normalize/embed |
| C15 | retrieval@3 ≥ 1.0 on fixtures/phase-3/retrieval/ |
| C16 | pgvector dimension locked in migration |

Contract: [phase-3-contract.md](../docs/governance/phase-3-contract.md)

## Phase 3 checklist

- [x] Planner approves contract
- [ ] Data — migrations + ADR-007/008
- [ ] Analytics — @zeref/analytics + fixtures
- [ ] Worker — normalize + embed + CLI
- [ ] API/Contracts — PHASE3 schemas
- [ ] QA — verify-phase-3 + CI
- [ ] Docs — ADRs, verify.md
- [ ] verify:phase-0/1/2/3 green + CI
- [ ] Planner sign-off Phase 3

## Do not start

- Phase 4+ until Planner signs off Phase 3

## Verify

```powershell
cd c:\Projects\zeref
$env:DATABASE_URL='postgres://zeref:zeref@localhost:35432/zeref'
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
npm run verify:phase-3
```
