# Zeref — Current State

**Last updated:** 2026-05-30  
**Status owner:** Lead orchestrator (update after every phase gate or Planner sign-off)

**Read first in any new chat:** this file → [LEAD_ORCHESTRATOR.md](./LEAD_ORCHESTRATOR.md) → [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md)

Also see `.planning/STATE.md` for commit SHAs; **this file is runtime truth for agents.**

---

## Executive summary

| Area | Status |
|------|--------|
| Phases 0–5 implementation | **DONE** (verify green in CI @ `568a5fc`) |
| Phase 5 Planner sign-off | **APPROVED** (scaffold) |
| Agent stack (GSD, council, uipro, Superpowers) | **DONE** |
| Phase 5.0.1 ops | **DONE** (2026-05-30) |
| Phase 5.0.2 dev perf + BFF loopback | **DONE** (2026-05-30) |
| Phase 5.1 Luke JARVIS HUD visual | **IMPLEMENTATION DONE** — Planner visual sign-off pending |
| Phase 6 Jarvis voice | **BLOCKED** until 5.1 signed off |

**Immediate goal:** Phase **5.1** Luke JARVIS HUD contract + implement. Skills: [SKILL_INVOCATION.md](./SKILL_INVOCATION.md).

---

## Pipeline (as built)

```
collect → normalize → embed → analyze → report
```

| Stage | Package / app | Queue job | Auto-chain |
|-------|---------------|-----------|------------|
| collect | `@zeref/worker`, `@zeref/instagram` | `collect` | none |
| normalize | `@zeref/worker` | `normalize` | → embed inline if `ZEREF_AUTO_EMBED` |
| embed | `@zeref/worker` | `embed` | — |
| analyze | `@zeref/worker`, `@zeref/analytics` | `analyze` | → report inline if `ZEREF_AUTO_REPORT` |
| report | `@zeref/worker`, `@zeref/reports` | `report` | — |

**Ops gap:** CLI `scripts/enqueue-*.mjs` sends to pg-boss but **no worker daemon** consumes queue in normal dev.

---

## Cockpit (Phase 5)

| Deliverable | Status |
|-------------|--------|
| `/cockpit` layout (Studio, Calendar \| Globe \| Reports, Research) | **DONE** |
| BFF `GET /api/v1/cockpit/slices` | **DONE** (fixture mode in CI) |
| Wireframe icosahedron globe | **SUPERSEDED** — point-cloud + rings @ `838e34d` (ADR-015 amendment) |
| Luke HUD shell + SIMULATED telemetry/AUDIO | **DONE** @ `838e34d` |
| Playwright 16/16 (layout + C48) | **DONE** with `ZEREF_PHASE51_UI=1` |
| SSE stub `GET /api/v1/events/stream` | **DONE** (P5.1-B) |
| Voice / live pipeline SSE | **DEFER** Phase 6 |

---

## Verify baseline

| Gate | Local | CI |
|------|-------|-----|
| `verify:phase-0` … `verify:phase-4` | OK with `DATABASE_URL` | OK |
| `verify:phase-5` | OK with `ZEREF_BFF_FIXTURE=1` | OK — **no live DB BFF test** |
| `verify:phase-5.1` | OK with `ZEREF_BFF_FIXTURE=1` + `ZEREF_PHASE51_UI=1` | OK — C48 enforced |

### QA — Phase 5.1 verify (P5.1-C)

| Deliverable | Status |
|-------------|--------|
| `scripts/verify-phase-5.1.mjs` | **DONE** — chains `verify:phase-0` … `verify:phase-5` + C48 |
| `apps/web/e2e/cockpit-hud-5.1.spec.ts` | **DONE** — C48 testids |
| CI **Phase 0–5.1 gate** | **DONE** — `ZEREF_PHASE51_UI=1` on 5.1 step |

```powershell
cd c:\Projects\zeref
$env:ZEREF_LLM_MOCK='1'
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_PHASE51_UI='1'
npm run verify:phase-5.1
```

---

## Agent stack install (2026-05-30)

| Component | Status |
|-----------|--------|
| GSD Redux | **DONE** — `.cursor/skills/gsd-*`, `.cursor/get-shit-done/` |
| UI UX Pro Max | **DONE** — `.cursor/skills/ui-ux-pro-max/` |
| Council skills | **PARTIAL** — 4 skills in `.cursor/skills/council-*`, `run-verify-gate` |
| Council board YAML | **DONE** — `config/council/zeref-board.yaml` |
| Cursor rules `.mdc` | **DONE** — `.cursor/rules/` |
| phase_gate scripts | **DONE** — `scripts/phase_gate.ps1`, `phase_gate.sh` |
| Superpowers plugin | **USER** — `/add-plugin superpowers` |

---

## What's NEXT

| # | Owner | Task |
|---|-------|------|
| 1 | User + Lead | Push; confirm CI Phase 0–5.1 green |
| 2 | Planner | Visual sign-off vs `lukebuildsai-jarvis-hud.jpeg` + screenshot `docs/design/reference/screenshots/zeref-cockpit-5.1-a.png` |
| 3 | Planner | Phase 6 voice discuss |

---

## Do not start

- Phase 6 voice until Phase 5.1 Planner sign-off
- Full-screen particle globe without ADR-015 amendment
- Fake scrolling telemetry (legacy ios theater pattern)

---

## Key paths

| Doc | Path |
|-----|------|
| Phase contracts | `docs/governance/phase-{0-5}-contract.md` |
| Verify | `docs/governance/verify.md` |
| Legacy lessons | `docs/handoff/legacy-ios.md` |
| Gap backlog | `docs/GAP_BACKLOG.md` |
| Ownership | `AGENTS.md` |
| Design system | `docs/design/DESIGN_SYSTEM.md` |
| Luke HUD ref | `docs/design/reference/lukebuildsai-jarvis-hud.jpeg` |
