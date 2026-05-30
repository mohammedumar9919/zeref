# Zeref — Phase 5.1 Contract (Discuss + Contract)

**Phase:** 5.1  
**Status:** **DRAFT** (requires Planner approval)  
**Theme:** Luke JARVIS HUD fusion — point-cloud globe, full-bleed hero, HUD chrome, glass columns

**Prerequisites:** Phase 5 implementation approved (`verify:phase-5` green; tip `568a5fc`). Phase 5.0.1 / 5.0.2 ops complete.

**Visual reference (binding):** [docs/design/reference/lukebuildsai-jarvis-hud.jpeg](../design/reference/lukebuildsai-jarvis-hud.jpeg)

---

## Open questions for Planner (with orchestrator recommendations)

| # | Question | Recommendation |
|---|----------|----------------|
| **Q1** | Globe perf budget with **point-cloud + rings** | **≤12k points** (instanced `Points` or buffer geometry) + **≤8k triangles** for ring meshes; total GPU budget **≤50k tris equivalent**; lazy client chunk unchanged. Dev **≥45fps** mid laptop; CI layout-only (no FPS gate). **ADR-015 amendment** required. |
| **Q2** | Telemetry / events API shape until real SSE | **`GET /api/v1/events/stream`** (SSE) returns **stub** stream: `event: heartbeat` + optional `event: pipeline` with `simulated: true` in payload; UI labels strip **`SIMULATED`** until worker emits real events (Phase 6 / ZR-026). Contract: `TelemetryEventSchema` in `@zeref/contracts`. |
| **Q3** | Layout: keep 4-panel product grid inside glass columns? | **Yes** — preserve Studio / Calendar / Reports / Research semantics and `data-testid` panel regions (C26 carry-forward); wrap in Luke HUD chrome (header chips, footer objective bar). Full-bleed **hero** is the globe column only (≥45vh). |

### Proposed conditions (C35–C42)

| ID | Condition |
|----|-----------|
| **C35** | Cockpit uses **Luke HUD shell**: top header (status chips), bottom footer (objective / system line), void background with subtle grid — per reference JPEG + [DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md) amendment. |
| **C36** | **Full-bleed hero globe** — center column **≥45vh** on desktop; globe **not** inside boxed `.hud-panel` chrome (replaces Phase 5 wireframe island box). |
| **C37** | Globe renders **point-cloud + compass rings** (not wireframe icosahedron); **ADR-015 amendment** approved and implemented. |
| **C38** | Four product panels remain in **glass columns** (left: Studio+Calendar; right: Reports+Research); existing panel `data-testid`s preserved. |
| **C39** | **Telemetry strip** visible in HUD (header or footer band); content **labeled `SIMULATED`** until real pipeline SSE (failures-checklist). |
| **C40** | **AUDIO I/O** placeholder (waveform or level meters) **labeled `SIMULATED`**; no STT/TTS/PTT (Phase 6). |
| **C41** | **`npm run verify:phase-5.1`** — extends phase-5 gate: Playwright layout (C25–C26), globe canvas + **point-cloud** marker, telemetry/audio testids, prior phases 0–5 still pass. |
| **C42** | **No Jarvis voice**, Realtime API, or live TTS in Phase 5.1 (C30 carry-forward). |

**Contracts agent:** **PARTIAL** — `TelemetryEventSchema` + `PHASE5_1_CONTRACT_VERSION` only if Q2 approved (BFF/Events agent).

**Data / Worker agents:** **SKIP** — no new job types; SSE stub may emit simulated events from route only.

---

## Goals

1. **Visual fusion** — Align cockpit with Luke JARVIS HUD reference while keeping Zeref’s four-panel product model.
2. **Globe upgrade** — Point-cloud earth + orbital rings; full-bleed hero; amend ADR-015.
3. **HUD chrome** — Header/footer operator framing; glass-wrapped panel columns.
4. **Honest placeholders** — Telemetry + AUDIO I/O visible but clearly **SIMULATED** until SSE + voice phases.
5. **Verify** — `verify:phase-5.1` in CI (Phase 0–5.1 gate or extend 0–5 script per Planner).
6. **Multi-agent delivery** — UI, BFF/Events shell, Docs/QA in **separate chats** after Planner approval.

---

## Non-goals (out of scope)

| Area | Notes |
|------|--------|
| Live pipeline SSE from worker | Phase 6+ / ZR-026; stub stream only in 5.1 |
| STT / TTS / PTT / Jarvis tools | Phase 6 |
| Conversation dock with live LLM | Placeholder UI optional; no OpenRouter from browser |
| Reports generation from UI | Unchanged — read-only BFF |
| Replacing four-panel routes | ADR-017 deep links preserved |
| Full-screen legacy Jarvis canvas | Bounded cockpit route; not fixed viewport overlay |

---

## Layout (target wireframe)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HUD HEADER — status chips · telemetry strip [SIMULATED]                │
├──────────────┬──────────────────────────────────────┬───────────────────┤
│  GLASS COL   │  FULL-BLEED HERO (≥45vh)             │  GLASS COL        │
│  Studio      │  · point-cloud globe                 │  Reports          │
│  Calendar    │  · compass rings                     │  Research         │
│              │  · optional conversation dock shell  │                   │
├──────────────┴──────────────────────────────────────┴───────────────────┤
│  HUD FOOTER — objective line · AUDIO I/O [SIMULATED]                      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Nav (unchanged C25):** Cockpit | Settings only.

---

## Globe (ADR-015 amendment summary)

| Phase 5 (current) | Phase 5.1 (target) |
|-------------------|---------------------|
| Wireframe icosahedron in `.hud-panel` box | Point-cloud + rings, full-bleed hero |
| ~5k tris icosahedron | ≤12k points + ≤8k tris rings |
| Idle rotation only | Idle rotation + subtle ring counter-rotation |

See [ADR-015-amendment-phase-5.1.md](./adr/ADR-015-amendment-phase-5.1.md).

---

## BFF / events (Q2 — shell only)

| Route | Phase 5.1 behavior |
|-------|------------------|
| `GET /api/v1/cockpit/slices` | Unchanged (ADR-016) |
| `GET /api/v1/reports/artifacts/:id` | Unchanged |
| `GET /api/v1/events/stream` | **New** — SSE stub; `Content-Type: text/event-stream`; events include `simulated: true` |

RSC pages may consume stub via `EventSource` in a **client island** or static SIMULATED copy until SSE wired — Planner picks in Q2.

---

## Verify: `npm run verify:phase-5.1`

| Check | Requirement |
|-------|-------------|
| Contract + ADR | phase-5.1-contract, ADR-015 amendment |
| Build | `npm run build` (includes Next) |
| C35–C40 | Playwright: HUD regions, hero min-height, globe canvas, simulated labels |
| C41 | `verify:phase-0` … `verify:phase-5` still pass |
| C42 | C30 import guard (no voice modules in web) |
| Perf smoke | Optional dev script: log point count + triangle estimate (not CI FPS gate) |

**CI:** extend **Phase 0–5.1 gate** (or run `verify:phase-5.1` after `verify:phase-5`).

---

## ADRs (Phase 5.1)

| ADR | Owner | Topic |
|-----|-------|--------|
| [ADR-015 amendment](./adr/ADR-015-amendment-phase-5.1.md) | UI | Point-cloud globe, rings, full-bleed hero (Q1) |
| ADR-019 (proposed) | BFF/Events | SSE stub stream + `TelemetryEventSchema` (Q2) |
| ADR-018 (extend) | QA | `verify:phase-5.1` harness |

---

## Acceptance criteria

- Planner approves Q1–Q3 and C35–C42.
- Reference JPEG matched in spirit (orchestrator screenshot compare in Planner packet).
- Playwright green locally + CI.
- No fake telemetry without **SIMULATED** label.
- Multi-agent process: Lead did **not** implement domain code in discuss pass.

---

## Agent ownership (after approval — separate chats)

| Agent | Deliverables |
|-------|----------------|
| **UI** | HUD shell, globe point-cloud, glass columns, Playwright visual selectors, DESIGN_SYSTEM update |
| **BFF/Events** | SSE stub route, optional `TelemetryEventSchema`, client hook shell |
| **Docs/QA** | `verify-phase-5.1.mjs`, CI gate, ADR index, CURRENT_STATE, legacy-ios HUD notes |

**Lead orchestrator:** integrate reports only; run `phase_gate` / verify 0–5.1.
