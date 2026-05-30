# Zeref — STATE

**Updated:** 2026-05-30

> **Agents:** prefer [docs/CURRENT_STATE.md](../docs/CURRENT_STATE.md) for runtime truth. This file tracks commits and checklists.

## Current position

- **Phase:** 5 implementation complete — Planner sign-off pending; **5.0.1 / 5.1 next**
- **Phase 5 tip:** `568a5fc`
- **Agent stack:** GSD + uipro installed 2026-05-30; docs committed

## Portable agent stack

- [x] GSD Redux v1.1.0
- [x] UI UX Pro Max at `.cursor/skills/ui-ux-pro-max/`
- [x] Council skills (propose/review/merge/run-verify-gate)
- [x] docs/CURRENT_STATE, GAP_BACKLOG, failures-checklist, council docs
- [ ] Superpowers — user `/add-plugin superpowers`
- [ ] config/council/zeref-board.yaml + .cursor/rules — pending agent mode commit

## Verify

```powershell
cd c:\Projects\zeref
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_LLM_MOCK='1'
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
npm run verify:phase-0
# ... through verify:phase-5
```

## Do not start

- Phase 6 until Phase 5.1 signed off
