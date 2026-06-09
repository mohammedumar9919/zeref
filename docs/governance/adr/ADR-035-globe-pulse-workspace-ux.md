# ADR-035: Globe pulse + workspace UX (Phase 6.2 — draft)

**Status:** **DRAFT** (Planner scoped 2026-06-08 — **no implementation until hotfix green + contract APPROVED**)  
**Date:** 2026-06-08  
**Owner:** UI agent (future P6.2-A)  
**Related:** [phase-6.2-contract.md](../phase-6.2-contract.md) C99–C104 · [ADR-033](./ADR-033-luke-tier2-visual-acceptance.md) · [ADR-023](./ADR-023-globe-voice-states.md) · [ADR-015](./ADR-015-globe-performance.md)

---

## Context

Phases 6.1 (Tier-2 HUD polish) and 8–9 (product hubs) shipped functional cockpit deep links. Planner approved **Phase 6.2 Visual Tier 3** for later:

- Workspace mode on deep routes (hide four-panel grid)
- Unified header (TopNav + HudHeader merge)
- Larger hero globe (≥58vh)
- Stronger voice pulse + JARVIS sync rings on globe wrapper

**Pre–Phase 10 hotfix (P8-HOTFIX-B/C)** addresses missing Studio/Reports hubs — **not** Tier-3 scope. Phase 6.2 must not start until `verify:hotfix-p8` green.

---

## Decision (draft)

### Workspace mode (C99)

| Route | Layout |
|-------|--------|
| `/cockpit` | Full grid + globe (unchanged hub) |
| `/cockpit/studio`, `/reports`, `/calendar`, `/research` | **Hub-only** or hub + detail — **no** four-panel grid |

Implementation via layout tokens in `CockpitShell` / route pages — not new BFF fields.

### Unified header (C100)

Single top rail replaces stacked `TopNav` + `HudHeader`. Status chips and objective line live in one component tree to match Luke reference single-bar chrome.

### Hero globe + pulse (C101–C104)

| Element | Rule |
|---------|------|
| Min height | ≥58vh on `/cockpit` (up from ADR-033 ≥45vh) |
| Voice pulse | CSS ring on `GlobeHero` wrapper driven by existing `data-globe-voice-state` |
| Brain sync rings | CSS animation on wrapper driven by `data-globe-brain-state` |
| WebGL internals | **Frozen** — `PointCloudGlobe.tsx` and point-count logic unchanged (ADR-015 amendment carry-forward) |

### Verify (C110 — draft)

`scripts/verify-phase-6.2.mjs`:

1. Chain `verify:phase-6.1`
2. Playwright with `ZEREF_PHASE62_UI=1` — unified header + workspace route testids
3. Does not replace `verify:phase-9` or P8 hotfix gate

---

## Consequences

- P6.2-A owns visual/workspace layout only; hotfix hubs remain product-owned surfaces.
- Pulse/sync rings are **honest** — tied to existing DOM attrs, no fake activity without voice/brain state.
- Planner visual sign-off via `zeref-cockpit-6.2-workspace.png` (C107).

---

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Fold workspace UX into P8 hotfix | Hotfix is minimal hub parity; Tier-3 is broader chrome refactor |
| Edit WebGL for pulse | Violates globe-frozen rule from 6.1/7; wrapper CSS sufficient |
| Client-side globe state polling | Violates RSC-first; use existing SSE-driven attrs on wrapper |
