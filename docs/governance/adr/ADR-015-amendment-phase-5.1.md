# ADR-015 Amendment — Phase 5.1 Luke JARVIS HUD globe

**Status:** **APPROVED** (Planner 2026-05-30; [phase-5.1-contract.md](../phase-5.1-contract.md))  
**Amends:** [ADR-015-globe-performance.md](./ADR-015-globe-performance.md)  
**Date:** 2026-05-30  
**Owner:** UI  
**Reference:** [lukebuildsai-jarvis-hud.jpeg](../../design/reference/lukebuildsai-jarvis-hud.jpeg)

---

## Context

Phase 5 shipped a **wireframe icosahedron** inside a **boxed** `.hud-panel` globe island (~5k triangles). The Luke JARVIS HUD reference requires a **point-cloud earth** with **compass rings**, **full-bleed hero** treatment (≥45vh), and operator framing that treats the globe as the visual anchor—not a card in a three-column grid.

[GAP_BACKLOG.md](../../GAP_BACKLOG.md) ZR-010, ZR-011 track this gap. [failures-checklist.md](../../failures-checklist.md) forbids shipping point-cloud without amending ADR-015 first.

---

## Decision (amendments to ADR-015)

### 1. Geometry model — **REPLACE** wireframe icosahedron

| Budget item | Limit |
|-------------|--------|
| Point cloud | **≤12,000** points (single `Points` or instanced sprites) |
| Ring meshes | **≤8,000** triangles total (compass / orbital rings) |
| Combined budget | Stay within spirit of original **≤50k tris** cap; no post-processing bloom |

### 2. Layout — **REPLACE** boxed panel island

- Globe column is **full-bleed hero**: minimum **45vh** on `lg+` breakpoints.
- Remove `.hud-panel` wrapper around WebGL canvas (chrome moves to HUD header/footer + glass side columns).
- Globe remains **client-only** (`next/dynamic`, `ssr: false`).

### 3. Animation

- Earth point cloud: slow Y rotation (similar to Phase 5 idle).
- Rings: optional counter-rotation at lower speed.
- **No** audio-reactive scale, voice state, or particle spawn from mic (Phase 6+).

### 4. FPS targets (unchanged in spirit)

- **Dev guideline:** ≥45fps on mid-tier laptop after warm compile.
- **CI:** Playwright asserts `globe-canvas` + optional `data-globe-mode="point-cloud"` — **no FPS gate**.

### 5. Dependencies

- `@react-three/fiber` + `three` remain lazy-loaded.
- Prefer `Points` + `BufferGeometry` over heavy `MeshDistortMaterial` for the primary earth representation.

---

## Superseded (Phase 5 text — do not implement after 5.1)

The following ADR-015 bullets are **superseded** for cockpit UI:

- "`icosahedronGeometry` radius 1.35, detail 3 (~5k triangles)" as the primary globe representation.
- "Globe code lives under `components/globe/` inside `.hud-panel` bounded center column" as a **boxed** panel.

**Retained:**

- Client-only island.
- Lazy chunk for three.js stack.
- No voice coupling in this phase.
- Panel data does not flow through globe component tree.

---

## Consequences

- `GlobeCanvas.tsx` / `GlobeIsland.tsx` refactored or replaced (e.g. `JarvisGlobeHero.tsx`).
- Playwright tests updated: still require `globe-canvas`; add assertion for point-cloud mode marker.
- Phase 5 screenshots are obsolete for visual sign-off; use Luke reference + new capture.

---

## Verification

```powershell
cd c:\Projects\zeref
$env:ZEREF_BFF_FIXTURE='1'
npm run build
npm run verify:phase-5.1   # after QA lands harness
```

Manual: compare layout to [lukebuildsai-jarvis-hud.jpeg](../../design/reference/lukebuildsai-jarvis-hud.jpeg) at 1080p.

---

## Planner approval

Merge this amendment into ADR-015 body (or mark ADR-015 "Amended by 5.1") upon **Phase 5.1 contract APPROVED**.
