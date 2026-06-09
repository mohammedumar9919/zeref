# Zeref — Phase 6.2 Contract (PLANNING)

**Phase:** 6.2  
**Status:** **PLANNING ONLY** — Planner scoped 2026-06-08; **no workers until P8 hotfix green + Planner APPROVED**  
**Theme:** Luke JARVIS HUD **Tier-3 visual** — workspace UX, hero globe, unified header

**Prerequisites:** Phase 6.1 implementation DONE; P8 hotfix (`verify:hotfix-p8`) green; Phase 9 APPROVED @ `9960c92`.

**Visual reference (binding when approved):** [lukebuildsai-jarvis-hud.jpeg](../design/reference/lukebuildsai-jarvis-hud.jpeg) · Tier-2 baseline @ `zeref-cockpit-6.1-hud.png`

**References:** [phase-6.1-contract.md](./phase-6.1-contract.md) (C91–C98) · [ADR-033](./adr/ADR-033-luke-tier2-visual-acceptance.md) · [ADR-035](./adr/ADR-035-globe-pulse-workspace-ux.md) (draft)

---

## Planner decisions (draft — pending APPROVED)

| # | Decision |
|---|----------|
| **Q1** | **DRAFT** — Tier-3 = **workspace mode** on deep routes: hide `CockpitGrid`, full-page hub/editor/scheduler surfaces. |
| **Q2** | **DRAFT** — **Unified header** — merge `TopNav` + `HudHeader` into one bar (Luke single-rail chrome). |
| **Q3** | **DRAFT** — **Hero globe** ≥58vh (up from 6.1 ≥45vh); narrower seamless side panels. |
| **Q4** | **DRAFT** — **Voice pulse + JARVIS sync rings** — visual amplitude tied to existing voice/brain state attrs (no new SSE types). |
| **Q5** | **DRAFT** — **`npm run verify:phase-6.2`** chains 0–6.1 + Tier-3 Playwright testids; independent of Phase 7–10 flags except existing CI chain. |

---

## Conditions (draft C99–C110)

| ID | Condition |
|----|-----------|
| **C99** | **Workspace mode** — `/cockpit/studio`, `/cockpit/reports`, `/cockpit/calendar`, `/cockpit/research` deep routes render hub/detail **without** four-panel grid (grid remains on `/cockpit` only). |
| **C100** | **Unified header** — single top bar: nav + status chips + objective strip; no double header stack. |
| **C101** | **Hero globe** — ≥58vh on `/cockpit`; side panels visually narrower / seamless gutter vs 6.1. |
| **C102** | **Voice pulse** — globe wrapper exposes pulse ring when `data-globe-voice-state` active; honest idle when silent. |
| **C103** | **JARVIS sync rings** — brain-state ring animation when `data-globe-brain-state` ≠ idle; no new brain event types. |
| **C104** | **Globe frozen internals** — no WebGL/point-count/mesh changes (ADR-035); wrapper + CSS only unless Planner amends. |
| **C105** | **RSC-first preserved** — no client refetch storms on hub routes (C88 carry-forward). |
| **C106** | **Playwright** — `cockpit-workspace-6.2.spec.ts` (or extend layout spec) asserts unified header + workspace routes hide grid. |
| **C107** | **Screenshot** — `docs/design/reference/screenshots/zeref-cockpit-6.2-workspace.png` for Planner sign-off. |
| **C108** | **File firewall** — UI-only; no BFF/API/packages/worker edits unless Lead hotfix for type-only imports. |
| **C109** | **Optional Wave 3** — Luke widgets (vitals, radar, clock) — **deferred** sub-slice; not required for 6.2 MVP. |
| **C110** | **`verify:phase-6.2`** — chains `verify:phase-6.1`; `ZEREF_PHASE62_UI=1`; CI env documented in verify.md. |

**CI env (draft):** Phase 6.1 flags + `ZEREF_PHASE62_UI=1`

---

## Amendment O — Tier-3 file firewall (draft)

### Allowed paths (P6.2-A UI)

- `apps/web/components/hud/**` (unified header)
- `apps/web/components/shell/TopNav.tsx`
- `apps/web/components/cockpit/CockpitShell.tsx`, `CockpitGrid.tsx` (workspace layout tokens)
- `apps/web/components/globe/GlobeHero.tsx`, globe wrapper pulse classes (**no** `PointCloudGlobe.tsx` logic)
- `apps/web/app/cockpit/**/page.tsx` (layout className only — **no** BFF changes)
- `apps/web/app/globals.css`, `apps/web/tailwind.config.ts`

### Forbidden paths (P6.2-A)

- `apps/web/lib/**`, `apps/web/app/api/**`
- `packages/**`, `apps/worker/**`
- Hub component **data** wiring in studio/reports/calendar/research (owned by product phases / hotfix)

### P6.2-E allowed (verify slice)

- `scripts/verify-phase-6.2.mjs`, `package.json`, `.github/workflows/ci.yml`
- `apps/web/e2e/cockpit-workspace-6.2.spec.ts`
- `docs/governance/verify.md`

---

## Spawn waves (draft — do not spawn yet)

| Wave | Slices | Gate |
|------|--------|------|
| **1** | **P6.2-A** UI workspace + header + globe pulse | Screenshot vs reference |
| **2** | **P6.2-E** verify + Playwright | `verify:phase-6.2` green |
| **3** | **P6.2-B** optional Luke widgets | Planner opt-in |

---

## Non-goals (binding when approved)

- No new pipeline jobs, contracts version bump, or Instagram collect behavior.
- No Phase 10 product features under 6.2 visual scope.
- No Amendment K calendar `GET :id` work.

---

## Exit gate before workers

1. P8 hotfix `verify:hotfix-p8` green on `main`
2. Planner marks this contract **APPROVED** (Q1–Q5 locked)
3. Lead updates `WORKER_TASK_CARDS_QUEUE.md` with P6.2 spawn cards
