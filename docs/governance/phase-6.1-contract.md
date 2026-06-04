# Zeref — Phase 6.1 Contract (Implementation)

**Phase:** 6.1  
**Status:** **APPROVED WITH CONDITIONS** (Planner 2026-06-03)  
**Theme:** Luke JARVIS HUD **Tier-2 visual polish** — UI-only, no behavior changes

**Prerequisites:** Phase 6 **APPROVED** (`183acf9`); Phase 5.1 baseline (`abb9dec`); Phase 7 brain states @ `0e7f8d5`; Phase 8 product panels @ `e5dc5b6`.

**Parallel track:** Runs **in parallel with Phase 9** in **separate worker chats**. Phase 6.1 is **UI-only** with strict file firewall. Phase 9 is primary for new product surface.

**Visual reference (binding):** [lukebuildsai-jarvis-hud.jpeg](../design/reference/lukebuildsai-jarvis-hud.jpeg)

**References:** [phase-5.1-contract.md](./phase-5.1-contract.md) (C43–C48 baseline) · [DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md) · [phase-7-contract.md](./phase-7-contract.md) (Tier-2 deferral note)

**Gap backlog:** ZR-012 (HUD chrome PARTIAL), ZR-013 (telemetry strip PARTIAL — **visual styling only** in 6.1; live pipeline SSE not in scope)

---

## Planner decisions (binding)

| # | Decision |
|---|----------|
| **Q1** | **APPROVED** — Acceptance = **token + layout checklist** (ADR-033) against Luke reference JPEG; Planner visual sign-off with screenshot diff, not pixel-perfect automated diff. |
| **Q2** | **APPROVED** — Scope = **HUD chrome, typography, spacing, glass columns, telemetry/AUDIO strip styling** only. **No** new SSE event types or pipeline worker bridge (ZR-013 backend → Phase 9+ / ops). |
| **Q3** | **APPROVED** — **Globe frozen** — no mesh/point-count/state-machine changes; preserve `data-globe-voice-state`, `data-globe-brain-state`, `data-globe-mode=point-cloud`. |
| **Q4** | **APPROVED** — **`npm run verify:phase-6.1`** chains 0–5.1 + extended Playwright visual testids (C48 carry-forward + C91–C94); independent of `verify:phase-9`. |
| **Q5** | **APPROVED** — **Non-goals enforced:** no voice, memory, studio, calendar, research **behavior** changes; no BFF/route edits; no `@zeref/contracts` bump unless Lead hotfix for type-only re-exports (default: **SKIP**). |

### Conditions (C91–C98)

| ID | Condition |
|----|-----------|
| **C91** | **HudHeader** — status chip density, mono labels, cyan accent alignment vs reference (C43). |
| **C92** | **HudFooter** — objective line typography + telemetry row spacing vs reference. |
| **C93** | **Glass columns** — panel border/frost/ padding harmonized across all four panels; `panel-*` testids preserved. |
| **C94** | **TelemetryStrip + AUDIO I/O** — visual polish only; **SIMULATED** / live badges remain honest; no fake-live without badge. |
| **C95** | **Globe hero** — ≥45vh preserved; **no** globe implementation file changes except wrapper className tokens in `GlobeHero` shell if needed. |
| **C96** | **Playwright** — extend `cockpit-hud-5.1.spec.ts` or add `cockpit-hud-6.1.spec.ts` for C91–C94 testids; all prior C48 testids still pass. |
| **C97** | **RSC-first preserved** — no client refetch storms introduced (C27). |
| **C98** | **`npm run verify:phase-6.1`** chains 0–5.1; `ZEREF_PHASE61_UI=1`; does not require Phase 7–9 flags. |

**CI env (binding):** Phase 5.1 flags + `ZEREF_PHASE61_UI=1`

---

## Amendment N — UI-only file firewall (binding)

### Allowed paths (P6.1-A)

- `apps/web/components/hud/**`
- `apps/web/components/cockpit/CockpitPanel.tsx`, `CockpitShell.tsx`, `CockpitGrid.tsx` (**className/layout tokens only** — no new data fetching)
- `apps/web/components/cockpit/TelemetryStrip.tsx` (**styling only**)
- `apps/web/components/cockpit/AudioIoStrip.tsx` or equivalent AUDIO I/O UI (**styling only**)
- `apps/web/components/globe/GlobeHero.tsx` (**wrapper chrome only** — no WebGL/point-cloud logic files)
- `apps/web/app/globals.css`, `apps/web/tailwind.config.ts`

### Forbidden paths (P6.1-A)

- `apps/web/app/api/**`
- `apps/web/lib/**`
- `packages/**`
- `apps/web/components/studio/**`, `calendar/**`, `research/**`
- `apps/web/components/voice/**`, `brain/**`, globe WebGL internals (`PointCloudGlobe.tsx`, etc.)
- `scripts/verify-phase-*.mjs` (P6.1-E owner)

### P6.1-E allowed

- `scripts/verify-phase-6.1.mjs`, `package.json` script, `.github/workflows/ci.yml` (6.1 step only)
- `apps/web/e2e/cockpit-hud-6.1.spec.ts` (or extend 5.1 spec)
- `docs/governance/verify.md` (6.1 section)

---

## Spawn waves (binding)

| Wave | Slices | Gate |
|------|--------|------|
| **1** | **P6.1-A** UI visual polish | Screenshot vs reference |
| **2** | **P6.1-E** verify + Playwright (after P6.1-A) | `verify:phase-6.1` green |

**Wave 1 parallel with P9-A** — separate chats. Do not combine 6.1 + Phase 9 in one worker.

---

## Goals

1. Close Tier-2 visual deferral from Phase 6/7/8 sign-offs.
2. Luke reference alignment for HUD chrome without re-opening voice/memory/product behavior.
3. Independent verify gate `verify:phase-6.1` for visual regression.

---

## Non-goals

| Area | Notes |
|------|--------|
| Research pipelines | Phase 9 (parallel) |
| Voice / STT / TTS / PTT behavior | Phase 6 frozen |
| Memory / brain SSE / globe brain states | Phase 7 frozen |
| Studio / Calendar product UX | Phase 8 frozen |
| Live pipeline SSE (non-simulated) | Not 6.1 — ZR-013 backend |
| Globe mesh / point budget / voice-brain state machine | Frozen (Q3) |
| `@zeref/contracts` schema bump | Default SKIP |

---

## Verify: `npm run verify:phase-6.1`

| Check | Requirement |
|-------|-------------|
| Chain | phases 0–5.1 pass |
| Playwright | C48 testids + C91–C94 extensions |
| Visual | Screenshot `zeref-cockpit-6.1-hud.png` for Planner sign-off |

---

## ADRs

| ADR | Status |
|-----|--------|
| [ADR-033](./adr/ADR-033-luke-tier2-visual-acceptance.md) | **APPROVED** |

**HARD RULE:** Lead does not implement domain code without agent reports.
