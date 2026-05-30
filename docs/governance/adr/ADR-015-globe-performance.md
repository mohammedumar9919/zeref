# ADR-015: Globe performance budget (client island)

**Status:** Accepted (Phase 5)  
**Owner:** UI  
**Related:** [Phase 5 contract](../phase-5-contract.md) Q1, C26, C30

## Context

The cockpit center column hosts a **thick globe** visual — the command-core anchor from the master plan wireframe. Phase 5 requires a performant Three.js/R3F shell without voice, physics, or worker coupling.

## Decision

1. **Client-only island** — Globe renders via `next/dynamic` with `ssr: false`. No WebGL on the server.
2. **Lazy chunk** — `@react-three/fiber`, `@react-three/drei`, and `three` load only when the globe island mounts.
3. **Mesh budget** — Base geometry **≤50k triangles**:
   - `icosahedronGeometry` radius `1.35`, detail **`3`** (~5k triangles).
   - No particle systems, post-processing, or secondary meshes in Phase 5.
4. **Animation** — Idle rotation only (`useFrame` delta rotation). No audio/voice reactivity (C30).
5. **FPS targets**
   - **Dev guideline:** ≥45fps on mid-tier laptop (Chrome, 1080p, single globe).
   - **CI smoke:** Playwright asserts **layout + canvas presence** only; no FPS gate in Phase 5 harness (QA ADR-018).

## Consequences

- Globe code lives under `apps/web/components/globe/`.
- Panel data never flows through the globe component tree.
- Future voice reactivity (Phase 6+) must respect the same triangle budget or add ADR amendment.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Server-rendered static SVG globe | Loses wireframe depth; wireframe spec in wireframe |
| Full-screen fixed canvas (legacy Jarvis) | Phase 5 wireframe embeds globe **inside** center column |
| High-detail sphere + postprocessing | Exceeds perf budget for minimal Phase 5 value |
