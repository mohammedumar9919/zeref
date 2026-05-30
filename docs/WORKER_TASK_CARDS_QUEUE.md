# Worker task cards queue — Zeref

Lead copies cards into **new** worker chats. Update status after each slice.

---

## READY — Phase 5.1 (Planner APPROVED — spawn in order: B+C parallel, then A)

Full prompts below — copy entire fenced block into a **new** Composer chat.

---

### Card P5.1-B — Agent BFF/Events (run FIRST; parallel with C)

```text
You are the Zeref BFF/Events agent for Phase 5.1 slice P5.1-B.

HARD RULE
- Implement ONLY this slice. Do not touch globe/UI components or worker.
- When done, STOP and post a report (files changed, how to test, any blockers). Do not claim Planner sign-off.

Skills — invoke before acting:
1. using-superpowers
2. test-driven-development
3. council-review-slice (for schema changes)
4. verification-before-completion + run-verify-gate before claiming done

Read first:
- docs/SKILL_INVOCATION.md
- docs/CURRENT_STATE.md
- docs/failures-checklist.md
- docs/governance/phase-5.1-contract.md (Q2 locked)
- docs/governance/adr/ADR-019-telemetry-sse-stub.md

Repo: c:\Projects\zeref

Deliverables
1. packages/contracts — TelemetryEventSchema + PHASE5_1_CONTRACT_VERSION (export from package index)
2. apps/web/app/api/v1/events/stream/route.ts — GET SSE stub:
   - Content-Type: text/event-stream
   - Heartbeat every 15s (event: heartbeat)
   - event: telemetry with JSON { simulated: true, message, ts }
3. Optional: apps/web/lib/events/* helpers + unit tests for schema parse

Allowed paths
- apps/web/app/api/v1/events/**
- packages/contracts/src/**
- apps/web/lib/** (events only)
- packages/contracts tests if added

Forbidden
- apps/web/components/**
- apps/worker/**
- Globe / HUD layout

Acceptance (run and paste output)
- npm run build -w @zeref/contracts
- curl or Invoke-WebRequest smoke: stream returns events with simulated:true
- npm test -w @zeref/contracts (if tests added)

Report back: commit hash, file list, curl sample, test output.
```

---

### Card P5.1-C — Agent Docs/QA (run FIRST in parallel with B)

```text
You are the Zeref Docs/QA agent for Phase 5.1 slice P5.1-C.

HARD RULE
- Scaffold verify + CI only. Do NOT edit apps/web/components/** (UI agent owns HUD).
- STOP with report when done.

Skills — invoke before acting:
1. using-superpowers
2. run-verify-gate
3. verification-before-completion

Read first:
- docs/SKILL_INVOCATION.md
- docs/governance/phase-5.1-contract.md (C43–C50, especially C48 testids)
- docs/governance/verify.md
- scripts/verify-phase-5.mjs (pattern to extend)

Repo: c:\Projects\zeref

Deliverables
1. scripts/verify-phase-5.1.mjs — runs verify:phase-0 … phase-5, then Playwright checks for:
   hud-header, hud-footer, telemetry-simulated, audio-io-simulated, data-globe-mode=point-cloud
   (tests may skip/fail gracefully until UI lands — document that)
2. package.json — "verify:phase-5.1" script
3. .github/workflows/ci.yml — Phase 0–5.1 gate after phase-5
4. docs/governance/adr/README.md — ADR-015 amendment + ADR-019 status APPROVED
5. docs/governance/adr/ADR-018 — note verify:phase-5.1 extension

Allowed
- scripts/verify-phase-5.1.mjs
- .github/workflows/ci.yml
- docs/governance/**
- docs/CURRENT_STATE.md (QA section only)
- package.json (verify script)
- apps/web/e2e/** ONLY if adding stub tests for new testids (coordinate with UI)

Forbidden
- apps/web/components/**

Acceptance
- node scripts/verify-phase-5.1.mjs (or npm run verify:phase-5.1) — document expected failures pre-UI

Report back: file list, CI diff summary, verify command output.
```

---

### Card P5.1-A — Agent UI (run AFTER B + C reports)

```text
You are the Zeref UI agent for Phase 5.1 slice P5.1-A.

HARD RULE
- HUD + globe + Playwright only. Wire EventSource to existing GET /api/v1/events/stream from BFF agent.
- No OpenRouter, no voice. STOP with report + screenshot path.

Skills — invoke before acting:
1. using-superpowers
2. brainstorming
3. ui-ux-pro-max
4. test-driven-development
5. verification-before-completion

Read first:
- docs/SKILL_INVOCATION.md
- docs/design/reference/lukebuildsai-jarvis-hud.jpeg
- docs/governance/phase-5.1-contract.md (C43–C50)
- docs/governance/adr/ADR-015-amendment-phase-5.1.md
- docs/DEV_PERFORMANCE.md

Repo: c:\Projects\zeref

Deliverables
1. HudShell — header (data-testid=hud-header) + footer (hud-footer) wrapping CockpitGrid
2. GlobeIsland — remove .hud-panel wrapper; full-bleed hero ≥45vh; keep data-testid=globe-island
3. GlobeCanvas — point-cloud Points + ring meshes; data-globe-mode=point-cloud on canvas/island
4. Glass column wrappers for left/right panels (preserve panel-studio, panel-calendar, panel-reports, panel-research)
5. TelemetryStrip — client EventSource → /api/v1/events/stream; badge data-testid=telemetry-simulated
6. AUDIO I/O footer placeholder — data-testid=audio-io-simulated, label SIMULATED
7. apps/web/e2e/cockpit-layout.spec.ts — assert new testids per C48
8. docs/design/DESIGN_SYSTEM.md — Luke HUD notes

Allowed
- apps/web/components/**
- apps/web/app/cockpit/**
- apps/web/app/globals.css
- apps/web/e2e/**

Forbidden
- apps/web/app/api/** (except if hotfix required — prefer BFF agent)
- packages/contracts/**
- apps/worker/**

Acceptance
- npm run verify:phase-5.1 (full gate)
- Playwright 6+ tests green
- Screenshot vs lukebuildsai-jarvis-hud.jpeg for Planner packet

Report back: files changed, verify output, screenshot path, perf note (point/tri counts).
```

---

## COMPLETED — Phase 5.0.x / Phase 5

See `docs/CURRENT_STATE.md` and git log @ `568a5fc`.

---

## Template (blank)

See [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md).
