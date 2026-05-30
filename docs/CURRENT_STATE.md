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
| Phase 5.1 Luke JARVIS HUD visual | **APPROVED** — implement via 3 agent chats (BFF → UI, QA parallel) |
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
| Wireframe icosahedron globe | **DONE** — superseded by 5.1 point-cloud (ADR-015 amendment draft) |
| Playwright 6/6 in CI | **DONE** |
| RSC `getCockpitSlices()` | **DONE** — **silent empty on error** (fix in 5.0.1) |
| Voice / telemetry / AUDIO I/O | **DEFER** 5.1 shell / Phase 6 |

---

## Verify baseline

| Gate | Local | CI |
|------|-------|-----|
| `verify:phase-0` … `verify:phase-4` | OK with `DATABASE_URL` | OK |
| `verify:phase-5` | OK with `ZEREF_BFF_FIXTURE=1` | OK — **no live DB BFF test** |

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
$env:ZEREF_LLM_MOCK='1'
$env:ZEREF_BFF_FIXTURE='1'
.\scripts\phase_gate.ps1 -Phase 5   # when script committed
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
| 1 | Lead | Commit agent stack docs + `.cursor` + reference JPEG |
| 2 | Planner | Approve Phase 5.0.1 ops contract |
| 3 | Agent Worker + QA | Worker daemon, `dev:stack`, `run-pipeline.mjs` |
| 4 | Agent UI + BFF | Fix silent empty BFF; optional live DB verify job |
| 5 | Planner | Approve [phase-5.1-contract.md](./governance/phase-5.1-contract.md) + ADR-015 amendment |
| 6 | Agents UI / BFF-Events / Docs-QA | Implement 5.1 — **separate chats** after approval |
| 7 | Planner | Phase 6 voice discuss |

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
