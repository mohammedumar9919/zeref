# Zeref — Phase 5.1 Contract (Implementation)

**Phase:** 5.1  
**Status:** **APPROVED WITH CONDITIONS** (Planner sign-off 2026-05-30; contract @ `3d8b789` + doc fix)  
**Theme:** Luke JARVIS HUD fusion — point-cloud globe, full-bleed hero, HUD chrome, glass columns

**Prerequisites:** Phase 5 approved (`verify:phase-5` green; tip `568a5fc`). Phase 5.0.1 / 5.0.2 complete.

**Visual reference (binding):** [docs/design/reference/lukebuildsai-jarvis-hud.jpeg](../design/reference/lukebuildsai-jarvis-hud.jpeg)

---

## Planner decisions (binding)

| # | Decision |
|---|----------|
| **Q1** | **APPROVED** — ≤12k points + ≤8k tris rings; full-bleed ≥45vh; [ADR-015 amendment](./adr/ADR-015-amendment-phase-5.1.md) |
| **Q2** | **APPROVED** — `GET /api/v1/events/stream` SSE stub with `simulated: true`; client **`EventSource`** island + visible **`SIMULATED`** badge; [ADR-019](./adr/ADR-019-telemetry-sse-stub.md) |
| **Q3** | **APPROVED** — 4 panels in glass columns; hero = globe only; preserve panel `data-testid`s (C26 carry-forward) |

### Conditions (C43–C50)

| ID | Condition |
|----|-----------|
| **C43** | Cockpit uses **Luke HUD shell**: top header (status chips), bottom footer (objective / system line) — per reference + [DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md). |
| **C44** | **Full-bleed hero globe** — center **≥45vh** on desktop; globe **not** inside boxed `.hud-panel` chrome. |
| **C45** | Globe = **point-cloud + compass rings** (not wireframe icosahedron); ADR-015 amendment implemented. |
| **C46** | Four product panels in **glass columns**; preserve `panel-studio`, `panel-calendar`, `panel-reports`, `panel-research`. |
| **C47** | **Telemetry strip** + **`SIMULATED`** badge when events are stubbed ([failures-checklist.md](../failures-checklist.md)). |
| **C48** | Playwright: preserve `cockpit-grid`, `panel-*`, `globe-island`, `globe-canvas`; **add** `hud-header`, `hud-footer`, `telemetry-simulated`, `audio-io-simulated`, `data-globe-mode=point-cloud`. `globe-island` = hero wrapper **without** `.hud-panel` chrome. |
| **C49** | **`npm run verify:phase-5.1`** — phases 0–5 + Playwright HUD/globe/simulated; CI Phase 0–5.1 gate. |
| **C50** | No Jarvis voice, STT, TTS, PTT, Realtime API (C30 carry-forward). |

**Contracts (Q2 — locked):** BFF/Events agent owns `TelemetryEventSchema` + `PHASE5_1_CONTRACT_VERSION` in `@zeref/contracts`.

**Data / Worker:** **SKIP** — no worker changes in 5.1.

---

## Q2 implementation ownership (locked)

| Piece | Owner | Path |
|-------|-------|------|
| SSE route | **BFF/Events** | `apps/web/app/api/v1/events/stream/route.ts` |
| Event schema | **BFF/Events** | `packages/contracts/src/phase5/` (or `phase5.1/`) — `TelemetryEventSchema`, `PHASE5_1_CONTRACT_VERSION` |
| Telemetry UI | **UI** | Client `TelemetryStrip` component + `EventSource` to `/api/v1/events/stream` |
| AUDIO I/O UI | **UI** | Footer placeholder labeled **SIMULATED** |

Stub stream: heartbeat every **15s** + `event: telemetry` JSON `{ simulated: true, message, ts }`. No worker emission in 5.1.

---

## Implementation order (Planner)

1. **P5.1-B** BFF/Events (+ **P5.1-C** QA scaffold — parallel OK)
2. **P5.1-A** UI (depends on SSE route + verify script existing)
3. User: `.\scripts\phase_gate.ps1` / `verify:phase-0` … `verify:phase-5.1`
4. Planner visual sign-off vs reference JPEG

---

## Goals

1. Luke HUD visual fusion with four-panel product model preserved.
2. Point-cloud globe + rings; full-bleed hero; ADR-015 amended.
3. Honest **SIMULATED** telemetry + AUDIO I/O placeholders.
4. `verify:phase-5.1` in CI.
5. **Multi-agent** — separate chats; Lead integrates reports only.

---

## Non-goals

Live worker SSE, voice/STT/TTS, OpenRouter from browser, fake telemetry without SIMULATED label, point-cloud without ADR-015 amendment.

---

## BFF routes

| Route | Behavior |
|-------|----------|
| `GET /api/v1/cockpit/slices` | Unchanged |
| `GET /api/v1/reports/artifacts/:id` | Unchanged |
| `GET /api/v1/events/stream` | **New** — SSE stub (`simulated: true`) |

---

## Verify: `npm run verify:phase-5.1`

| Check | Requirement |
|-------|-------------|
| Contract + ADRs | phase-5.1, ADR-015 amendment, ADR-019, ADR-018 extended |
| C43–C48 | Playwright per C48 table |
| C49 | phases 0–5 + phase-5.1 |
| C50 | C30 voice import guard |

---

## ADRs

| ADR | Status |
|-----|--------|
| [ADR-015 amendment](./adr/ADR-015-amendment-phase-5.1.md) | **APPROVED** |
| [ADR-019](./adr/ADR-019-telemetry-sse-stub.md) | **APPROVED** |
| [ADR-018](./adr/ADR-018-verify-phase-5-harness.md) | Extend for 5.1 |

---

## Agent ownership

| Agent | Deliverables |
|-------|----------------|
| **BFF/Events** | SSE route, contracts schema |
| **UI** | HudShell, point-cloud globe, glass columns, TelemetryStrip, Playwright |
| **Docs/QA** | verify-phase-5.1.mjs, CI, ADR index |

**HARD RULE:** Lead does not implement domain code without agent reports.
