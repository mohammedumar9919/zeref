# Zeref — STATE

**Updated:** 2026-05-29

## Current position

- **Phase:** 4 (implementation in progress)
- **Last completed:** Phase 3 (planner-approved; `6b5e60b`, CI Phase 0–3 green)
- **Blocker:** none

## Planner decisions

### Phase 3 (complete)

Q1–Q3, C11–C16 — see [phase-3-contract.md](../docs/governance/phase-3-contract.md).

### Phase 4 (approved)

| Item | Decision |
|------|----------|
| Q1 | `openai/gpt-4o-mini`; CI `ZEREF_LLM_MOCK=1` |
| Q2 | One report job → `elite` + optional `jarvis_brief` |
| Q3 | Auto-chain unless `ZEREF_AUTO_REPORT=0` |
| C17–C21 | As contract |
| C22 | Relax verify-phase-3 registry; 5 jobs in verify-phase-4 |
| C23 | `elite` artifact always required |
| Data | SKIP |

Contract: [phase-4-contract.md](../docs/governance/phase-4-contract.md)

## Phase 4 checklist

- [x] Planner approves contract (Q1–Q3, C17–C23)
- [ ] Reports / Worker / API / QA / Docs agents complete
- [ ] `npm run verify:phase-4` green
- [ ] CI Phase 0–4 green
- [ ] Planner sign-off Phase 4

## Do not start

- Phase 5+ (Cockpit UI) until Phase 4 signed off

## Verify (orchestrator)

```powershell
cd c:\Projects\zeref
$env:DATABASE_URL='postgres://zeref:zeref@localhost:35432/zeref'
$env:ZEREF_LLM_MOCK='1'
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
npm run verify:phase-3
npm run verify:phase-4
```
