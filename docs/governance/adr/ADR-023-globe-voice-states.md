# ADR-023: Globe voice states (Phase 6)

**Status:** **APPROVED** (Planner 2026-05-30; Amendment C)  
**Date:** 2026-05-30  
**Owner:** UI agent  
**Related:** C57 · [ADR-015 amendment](./ADR-015-amendment-phase-5.1.md) · [GAP ZR-024](../../GAP_BACKLOG.md)

---

## Context

Phase 5.1 globe: point-cloud + rings, idle rotation only. Luke HUD reference implies the hero reacts during operator interaction. ADR-015 amendment deferred audio-reactive visuals to Phase 6+.

---

## Decision

1. **`data-globe-voice-state`** on `globe-island` (and optionally `globe-canvas`):  
   `idle` | `listening` | `thinking` | `speaking`

2. Visual mapping (minimum):

| State | Behavior |
|-------|----------|
| `idle` | Phase 5.1 defaults (slow rotation) |
| `listening` | Brighter point opacity; ring pulse (PTT held) |
| `thinking` | Faster ring rotation; **opacity/scale pulse** on point-cloud + rings (shader-safe — **no post-processing bloom** per ADR-015) |
| `speaking` | Output-level-driven point scale (from AUDIO I/O analyser) |

3. **Perf budget unchanged:** ≤12k points, ≤8k ring tris; no new geometry types; **no new post-processing passes** in Phase 6.
4. State driven by **client voice controller** — props from PTT/TTS hooks, not direct mic access inside R3F loop.

---

## Consequences

- UI agent owns `GlobeCanvas` / `GlobeIsland` state wiring.
- Playwright: assert state attribute after mock PTT turn with `ZEREF_PHASE6_VOICE=1`.

---

## Verification

- `data-globe-voice-state` transitions visible in e2e mock path.
- Dev ≥45fps guideline on mid laptop (manual; not CI FPS gate).
