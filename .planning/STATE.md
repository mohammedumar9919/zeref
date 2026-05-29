# Zeref — STATE

**Updated:** 2026-05-29

## Current position

- **Phase:** 5 (**discuss + contract only** — no implementation until Planner approves)
- **Last completed:** Phase 4 (planner-approved; `dc2adb1`, CI Phase 0–4 green)
- **Blocker:** none

## Planner decisions

### Phase 4 (complete)

Q1–Q3, C17–C23 — see [phase-4-contract.md](../docs/governance/phase-4-contract.md).

### Phase 5 (pending)

- Contract draft: [phase-5-contract.md](../docs/governance/phase-5-contract.md)
- Theme: Cockpit UI shell (4 panels + globe, RSC-first, BFF `/api/v1`, Playwright in CI)

## Governance entry points

| Artifact | Path |
|----------|------|
| Phase 5 contract (draft) | `docs/governance/phase-5-contract.md` |
| Design system (Phase 5) | `docs/design/DESIGN_SYSTEM.md` (to be created) |
| Verify | `docs/governance/verify.md` |

## Phase 4 checklist (complete)

- [x] Planner sign-off Phase 4
- [x] `verify:phase-0` … `verify:phase-4` green + CI

## Phase 5 checklist (discuss only)

- [ ] Planner approves `phase-5-contract.md` (Q1–Q3, C24–C30)
- [ ] User spawns UI / API / Contracts / QA / Docs chats (orchestrator prompts)
- [ ] Orchestrator integrates agent reports (no orchestrator domain code)
- [ ] `npm run verify:phase-5` green
- [ ] Planner sign-off Phase 5

## Do not start

- Phase 5 **implementation** until Planner approves contract
- Phase 6+ (Jarvis voice) until Phase 5 signed off
- **Orchestrator must not write apps/web domain code** — agent chats only

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
# Phase 5 (after implementation):
# npm run verify:phase-5
```
