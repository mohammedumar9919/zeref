# Zeref — STATE

**Updated:** 2026-05-29

## Current position

- **Phase:** 5 (**implementation in progress** — contract DRAFT until Planner approves)
- **Last completed:** Phase 4 (planner-approved; `dc2adb1`, CI Phase 0–4 green)
- **Blocker:** none

## Planner decisions

### Phase 4 (complete)

Q1–Q3, C17–C23 — see [phase-4-contract.md](../docs/governance/phase-4-contract.md).

### Phase 5 (pending approval)

Contract draft: [phase-5-contract.md](../docs/governance/phase-5-contract.md) (Q1–Q3, C24–C30)

| ID | Summary | ADR |
|----|---------|-----|
| Q1 | Globe client island; ≤50k tris; lazy chunk | ADR-015 |
| Q2 | BFF summary DTOs; artifact detail by ID | ADR-016 |
| Q3 | `/cockpit` + deep links; Cockpit \| Settings nav | ADR-017 |
| C24 | `PHASE5_CONTRACT_VERSION`, `CockpitSlicesSchema` | contracts |
| C25–C26 | 4 panels + center globe layout | ADR-015/017 |
| C27 | RSC-first; BFF in `apps/web` | ADR-016/017 |
| C28 | Playwright in CI | ADR-018 |
| C29 | Reports read-only from DB | ADR-016 |
| C30 | No voice/STT/TTS in Phase 5 | ADR-015/018 |

## Governance entry points

| Artifact | Path |
|----------|------|
| Phase 5 contract (draft) | `docs/governance/phase-5-contract.md` |
| ADR index | `docs/governance/adr/README.md` |
| ADR-015–018 | `docs/governance/adr/ADR-015-globe-performance.md` … `ADR-018-verify-phase-5-harness.md` |
| Design system | `docs/design/DESIGN_SYSTEM.md` |
| Legacy cockpit salvage | `docs/handoff/legacy-ios.md` |
| Verify | `docs/governance/verify.md` |

## Phase 4 checklist (complete)

- [x] Planner sign-off Phase 4
- [x] `verify:phase-0` … `verify:phase-4` green + CI

## Phase 5 checklist

- [ ] Planner approves `phase-5-contract.md` (Q1–Q3, C24–C30)
- [ ] UI — cockpit layout, globe, RSC pages (confirm in verify log)
- [ ] API — BFF `/api/v1` routes (confirm in verify log)
- [ ] Contracts — `PHASE5_CONTRACT_VERSION`, fixtures (confirm in verify log)
- [ ] QA — `verify-phase-5.mjs`, Playwright CI (confirm in verify log)
- [x] Docs — ADR-015–018, verify.md Phase 5, legacy cockpit notes
- [ ] `npm run verify:phase-0` … `verify:phase-5` green locally + CI
- [ ] Planner sign-off Phase 5

## Agent roster (Phase 5)

| Agent | Status |
|-------|--------|
| UI | Report back — confirm in verify log |
| API | Report back — confirm in verify log |
| Contracts | Report back — confirm in verify log |
| QA | Report back — confirm in verify log |
| Docs | Done — ADR-015–018, verify.md, legacy-ios cockpit |

## Session log

| When | Who | What |
|------|-----|------|
| 2026-05-29 | Docs | ADR-015–018 cross-links, verify.md Phase 5, legacy cockpit salvage, STATE |

## Do not start

- Phase 6 (Jarvis voice) until Planner signs off Phase 5
- Mark Phase 5 **done** until `verify:phase-5` green + Planner sign-off

## Verify (orchestrator)

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
$env:ZEREF_LLM_MOCK='1'
$env:ZEREF_BFF_FIXTURE='1'
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
npm run verify:phase-3
npm run verify:phase-4
npm run verify:phase-5
```

See [verify.md](../docs/governance/verify.md).
