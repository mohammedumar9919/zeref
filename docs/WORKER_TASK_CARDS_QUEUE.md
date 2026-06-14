# Worker task cards queue — Zeref

Lead copies cards into **new** worker chats. Update status after each slice.

---

## COMPLETED — Phase 6 (APPROVED 2026-05-31)

Implementation @ `183acf9`; CI @ `d9c589f`; hotfixes `9c5869f` / `358d757`; screenshot @ `3020d1e`.

| Slice | Commit |
|-------|--------|
| P6-A Whisper | `7cd1f2b` |
| P6-B Kernel | `d1a1063` |
| P6-C BFF/Voice | `4171e14` |
| P6-E Docs/QA | `2cbe98b` |
| P6-D UI | `183acf9` |
| P6-HOTFIX-A | `9c5869f` |
| P6-HOTFIX-B | `358d757` |

---

## COMPLETED — Phase 7 (APPROVED 2026-06-03)

| Slice | Commit |
|-------|--------|
| P7-A Memory + schema | `93ef982` |
| P7-C BFF + outbox | `547103b` |
| P7-B Kernel memory tools | `afffaef` |
| P7-C hotfix (build + SSE test) | `5084a9d` |
| P7-E verify + CI gate | `0461bc1` |
| P7-D UI brain states | `0e7f8d5` |

Screenshot: `zeref-cockpit-7-brain.png` @ `0e7f8d5` · `verify:phase-7` green 2026-06-03

---

## COMPLETED — Phase 8 (APPROVED 2026-06-03)

| Slice | Commit |
|-------|--------|
| P8-A Contracts + Data | `12a0e65` |
| P8-B BFF | `10240c3` |
| P8-E scaffold | `7678cee` |
| P8-C Studio UI | `c159de9` |
| P8-D Calendar UI | `76eaf64` |
| P8-E Wave 4 e2e + build fix | `47f61ec` |
| QA Playwright reuse fix | `e5dc5b6` |

`verify:phase-8` green 2026-06-03 · Screenshots: `zeref-studio-editor-p8c.png`, `zeref-calendar-scheduler-8.png`

**Follow-up (non-blocking):** `GET /api/v1/calendar/events/:id` (C73) — **deferred** per Amendment K; P8-HOTFIX-A **NO** before Phase 9.

---

## COMPLETED — Phase 9 (APPROVED 2026-06-08)

Merge @ `9960c92` · CI Phase 0–9 gate green · `verify:phase-9` enforced (research e2e 2/2).

| Slice | Commit |
|-------|--------|
| Governance + cards | `02956be` |
| P9-A Contracts + worker | `67e606e` |
| P9-B BFF | `c5032f4` |
| P9-E scaffold | `b38aa55` |
| Harness fix | `04140ec` |
| P9-C Research UI | `552e788` |
| P9-E Wave 4 e2e | `5db21d6` |
| Build fix (jarvis-kernel refs) | `d7e241f` |

Screenshot: `zeref-cockpit-research-hub.png` @ `552e788`

---

## COMPLETED — P8 hotfix (2026-06-08)

Exit gate satisfied — `verify:hotfix-p8` green (local). CI step after Verify Phase 9.

| Slice | Commit |
|-------|--------|
| P8-HOTFIX-B Studio hub | `f52e0ef` |
| P8-HOTFIX-C Reports hub | `019e7bd` |
| P8-HOTFIX-E verify + e2e + CI | `e7908d1` |

**Phase 10 unblocked** — await Planner contract before spawning P10 workers.

---

## IN PROGRESS — Phase 10.5 Stabilize & Instant (2026-06-14)

**Governance:** [phase-10.5-contract.md](./governance/phase-10.5-contract.md) APPROVED · [ADR-037](./governance/adr/ADR-037-sse-outbox-consolidation.md) · [ADR-038](./governance/adr/ADR-038-worker-health-real-probe.md)

**Prerequisites:** Phase 10 @ `d8ce6c0` · `verify:phase-10` green

| Wave | Slice | Status | Spawn |
|------|-------|--------|-------|
| **0** | Lead governance | **DONE** | — |
| **1** | **P10.5-A** Cockpit shell / single SSE | **DONE** | `a938875` |
| **1** | **P10.5-B** Backend singletons + probe | **DONE** | `0f69275` |
| **1** | **P10.5-C** Perf + nano drift | **DONE** | `892d013` |
| **2** | **P10.5-D** verify:phase-10.5 + CI | **DONE** | `e9ba6df` |

**Council mandatory:** A → layout/SSE; B → stream/enqueue/health; C → cockpit-bff.

---

### Card P10.5-A — Cockpit shell / single SSE (Wave 1 — SPAWN NOW)

```text
You are the Zeref UI agent for Phase 10.5 slice P10.5-A.

HARD RULE — ALLOWED ONLY:
- apps/web/app/cockpit/layout.tsx
- apps/web/app/cockpit/*/page.tsx (ONLY remove VoiceHudShell wrapper)
- apps/web/components/voice/VoiceProvider.tsx
- apps/web/components/hud/VoiceHudShell.tsx
- apps/web/components/hud/TelemetryStrip.tsx

FORBIDDEN: apps/web/app/api/**, lib/jobs/**, lib/ops/**, cockpit-bff.ts, bff.ts, HudHeader.tsx, loading.tsx, docs/**, scripts/**

Read first:
1. docs/governance/phase-10.5-contract.md (C125-C128)
2. docs/governance/adr/ADR-037-sse-outbox-consolidation.md
3. apps/web/app/cockpit/layout.tsx (currently passthrough)
4. Any cockpit page using VoiceHudShell (research, calendar, studio, reports)

TASK
- Move VoiceProvider + VoiceHudShell into cockpit/layout.tsx (ONE provider + ONE SSE for whole cockpit)
- Remove per-page VoiceHudShell from every cockpit/*/page.tsx
- TelemetryStrip consumes shared voice/event stream — NO second EventSource; close on error (no reconnect storm)

Acceptance
- npm test -w @zeref/web (voice + cockpit suites green)
- Manual: nav all panels — one EventSource in Network tab; voice state persists

COUNCIL: council-review-slice REQUIRED before merge (layout + VoiceProvider).

Report: commit hash, manual smoke, blockers. STOP with report.
```

---

### Card P10.5-B — Backend singletons & honesty (Wave 1 — SPAWN NOW)

```text
You are the Zeref BFF/Ops agent for Phase 10.5 slice P10.5-B.

HARD RULE — ALLOWED ONLY:
- apps/web/lib/jobs/enqueue-job.ts
- apps/web/app/api/v1/events/stream/route.ts
- apps/web/lib/ops/worker-health.ts
- apps/web/lib/cockpit/outbox-drain.ts (+ new poller under lib/cockpit/)
- scripts/dev-stack.mjs
- .env.example

FORBIDDEN: apps/web/app/cockpit/**, components/**, cockpit-bff.ts, bff.ts, docs/**

Read first:
1. docs/governance/phase-10.5-contract.md (C129-C131, C139)
2. ADR-037, ADR-038
3. apps/web/lib/cockpit/simulated-pipeline.ts (isOutboxDrainAllowed)
4. phase-10-contract C117/C124

TASK
- pg-boss singleton: module-level pool; no start/stop per enqueue click
- ONE process-level outbox poller; events/stream subscribes (keep C117 gating)
- worker-health: real probe (not env echo only) per ADR-038
- dev-stack: Whisper sidecar OR ZEREF_WHISPER_MOCK; set ZEREF_PHASE8_PRODUCT + ZEREF_PHASE9_RESEARCH on web
- .env.example: document all fixture/phase/mock flags

Acceptance
- npm test -w @zeref/web (ops + events green)
- npm run verify:phase-10 must stay green (C113-C124)

COUNCIL: council-review-slice REQUIRED (stream + enqueue + health).

Report: commit hash, sample worker-health JSON, blockers. STOP with report.
```

---

### Card P10.5-C — Perf + nano drift (Wave 1 — SPAWN NOW)

```text
You are the Zeref UI/BFF agent for Phase 10.5 slice P10.5-C.

HARD RULE — ALLOWED ONLY:
- apps/web/app/cockpit/**/loading.tsx (new)
- apps/web/lib/cockpit-bff.ts
- apps/web/lib/bff.ts
- apps/web/components/hud/HudHeader.tsx
- apps/web/app/settings/page.tsx
- apps/web/components/calendar/CalendarScheduler.tsx
- apps/web/lib/calendar/calendar-scheduler-utils.ts
- docs/api-contracts.md

FORBIDDEN: cockpit/layout.tsx, voice/**, VoiceHudShell.tsx, TelemetryStrip.tsx, app/api/**, lib/jobs/**, lib/ops/**, scripts/**

Read first:
1. docs/governance/phase-10.5-contract.md (C132-C138)
2. DEV_PERFORMANCE.md § Operator UAT

TASK
- loading.tsx + Suspense on cockpit routes
- Parallelize RSC in cockpit-bff (Promise.all not sequential)
- Optimistic UI on enqueue/save/schedule (<100ms feedback)
- CalendarScheduler: next/link not <a href> (~L548)
- N1 HudHeader real phase chip; N2 version markers; N5 api-contracts CockpitBffError; N6 research job type in calendar UI

Acceptance
- npm test -w @zeref/web (calendar + cockpit green)
- Manual warm nav target <800ms (document if dev compile skews)

COUNCIL: council-review-slice REQUIRED for cockpit-bff.ts.

Report: commit hash, files changed, blockers. STOP with report.
```

---

### Card P10.5-D — Verify gate (Wave 2 — after A+B+C)

```text
You are the Zeref QA agent for Phase 10.5 slice P10.5-D.

HARD RULE: scripts/verify-phase-10.5.mjs, apps/web/e2e/cockpit-stability-10.5.spec.ts (optional), package.json, .github/workflows/ci.yml, docs/governance/verify.md ONLY.

Deliverables
1. verify:phase-10.5 chains verify:phase-10
2. Stability e2e with ZEREF_PHASE105_STABILITY=1 (single EventSource / nav)
3. CI step after Verify Phase 10

Acceptance: verify:phase-10.5 green; verify:phase-10 still green.

STOP with report.
```

---

## COMPLETED — Phase 10 Live Ops (2026-06-14)

| Slice | Commit |
|-------|--------|
| Governance | `f15466b` |
| P10-A | `45880e6` |
| P10-F | `780ac36` |
| P10-B | `bd5da5f` |
| P10-E | `5a1c28f` |
| C69 fix | `0634f86` |
| Exit gate | `d8ce6c0` |

---

**Governance:** [phase-10-contract.md](./governance/phase-10-contract.md) APPROVED · [ADR-036](./governance/adr/ADR-036-live-ops-pipeline-truth.md)

**Prerequisites:** Phase 9 @ `9960c92` · P8 hotfix @ `e7908d1`

| Wave | Slice | Status | Commit |
|------|-------|--------|--------|
| **1** | **P10-A** Dev stack default | **DONE** | `45880e6` |
| **1** | **P10-B** Worker health + pipeline honesty | **DONE** | `bd5da5f` |
| **1** | **P10-F** C117 stream gate | **DONE** | `780ac36` |
| **2** | **P10-E** Verify (+ P10-D perf smoke) | **DONE** | `5a1c28f` |

**Blockers before Phase 10 APPROVED:**

1. Push commits to `origin/main`
2. Full `verify:phase-10` green — blocked by pre-existing **cockpit-brain-7 C69** latency flake inside nested hotfix chain
3. Planner functional sign-off after CI green

**Parallel:** P6.2-A workspace shell **MAY** still spawn (Amendment Q). P6.2-B after Phase 10 sign-off.

---

### Card P10-A — Agent Ops dev stack (COMPLETED — Wave 1)

Report: `dev-stack.mjs` passes `ZEREF_WORKER_AVAILABLE=1` to web; root `dev` → `dev:stack`; CI_SETUP + DEV_PERFORMANCE + ops docs. **Commit:** `45880e6`

---

### Card P10-B — Agent BFF worker health (COMPLETED — Wave 1, uncommitted)

Report: `GET /api/v1/ops/worker-health`; phase10 contracts + fixture; 10/10 unit tests (`phase-10-ops.test.mjs`); C124 env-only health handler. **Note:** `isOutboxDrainAllowed()` exported but not wired to `events/stream` — defer P10-F.

---

### Card P10-E — Agent QA verify (COMPLETED — Wave 2, uncommitted)

Report: `verify-phase-10.mjs` chains hotfix-p8 → phase-9; `cockpit-ops-10.spec.ts` 1/1; CI step after P8 hotfix; `perf-smoke.mjs` advisory (44ms warm). Phase 10 scoped checks green; full chain fails on C69 flake. **Do not re-spawn.**

---

### Card P10-F — Agent BFF C117 stream gate (OPTIONAL — Wave 3)

```text
You are the Zeref BFF agent for Phase 10 slice P10-F (C117 completion).

HARD RULE
- Implement ONLY: apps/web/app/api/v1/events/stream/route.ts, apps/web/test/** (stream gate test if needed).
- Do NOT edit scripts/**, packages/**, hud/**, worker/**.
- STOP with report.

Read first:
1. apps/web/lib/cockpit/simulated-pipeline.ts — isOutboxDrainAllowed()
2. apps/web/app/api/v1/events/stream/route.ts — current outbox poll
3. docs/governance/phase-10-contract.md C117

Deliverable: Gate outbox drain/poll on isOutboxDrainAllowed() so DB-present + worker-absent stays simulated-only.

Acceptance: npm test -w @zeref/web; existing phase-10-ops tests still pass.

Report: commit hash, test output.
```

---

## READY — Phase 6.1 sign-off

| Track | Status |
|-------|--------|
| **6.1** | Implementation DONE — Planner visual sign-off pending |

---

## PLANNING — Phase 6.2 Visual Tier 3

**Status:** Contract draft — [phase-6.2-contract.md](./governance/phase-6.2-contract.md) + [ADR-035](./governance/adr/ADR-035-globe-pulse-workspace-ux.md). P6.2-A may parallel P10 Wave 1.

Preview: workspace mode (deep routes hide grid), unified header, hero globe ≥58vh, voice pulse + JARVIS sync rings, optional Luke widgets Wave 3.

---

## ARCHIVE — Phase 9 + Phase 6.1 parallel track (2026-06-03 – 2026-06-08)

**Governance:** `phase-9-contract.md`, `phase-6.1-contract.md`, ADR-031/032/033 @ Lead commit.

| Track | Wave | Slice | Spawn |
|-------|------|-------|-------|
| **9** (primary) | 1 | ~~**P9-A**~~ | **DONE** |
| **6.1** (UI-only) | 1 | ~~**P6.1-A**~~ | **DONE** |
| **9** | 2 | ~~**P9-B**~~ + ~~**P9-E**~~ scaffold | **DONE** |
| **6.1** | 2 | ~~**P6.1-E**~~ | **DONE** |
| **9** | 3 | ~~**P9-C**~~ | **DONE** |
| **9** | 4 | ~~**P9-E**~~ finalize | **DONE** |

**File firewall:** Phase 9 ↔ 6.1 paths must not overlap (see Amendment M / N in contracts).

---

### Card P8-HOTFIX-B — Agent UI Studio hub (COMPLETED — Wave 1)

Report: StudioHub + /cockpit/studio hub pattern; data-testid studio-hub. **Commit:** `f52e0ef`

---

### Card P8-HOTFIX-C — Agent UI Reports hub (COMPLETED — Wave 1)

Report: ReportsHub + ReportArtifactDetail; ?artifact= RSC via getReportArtifact; placeholder removed. **Commit:** `019e7bd`

---

### Card P8-HOTFIX-B — Agent UI Studio hub (Wave 1 — ARCHIVED)

```text
You are the Zeref UI agent for slice P8-HOTFIX-B.

HARD RULE
- Implement ONLY apps/web/components/studio/StudioHub.tsx and apps/web/app/cockpit/studio/page.tsx.
- Do NOT edit packages/**, apps/worker/**, globe/**, hud/**, BFF routes, or API routes.
- STOP with report + blockers.

Skills: using-superpowers, brainstorming, ui-ux-pro-max, test-driven-development, verification-before-completion

Read first:
1. docs/CURRENT_STATE.md — P8 hotfix root cause
2. apps/web/app/cockpit/research/page.tsx — hub template (VoiceHudShell + CockpitGrid + Hub)
3. apps/web/components/research/ResearchHub.tsx — list + links pattern
4. apps/web/components/cockpit/StudioPanel.tsx — panel items shape
5. docs/governance/phase-8-contract.md C75

Env: ZEREF_BFF_FIXTURE=1, ZEREF_PHASE8_PRODUCT=1

Fixture entity id: 550e8400-e29b-41d4-a716-446655440001

Deliverables
1. StudioHub — lists slices.panels.studio.items; links to /cockpit/studio/[entityId]; honest empty state
2. /cockpit/studio — VoiceHudShell + CockpitGrid focus="studio" + StudioHub (match research/calendar)
3. data-testid="studio-hub"

Allowed: apps/web/components/studio/StudioHub.tsx, apps/web/app/cockpit/studio/page.tsx
Forbidden: packages/**, apps/worker/**, apps/web/components/globe/**, apps/web/components/hud/**, apps/web/lib/**, apps/web/app/api/**

Acceptance
- /cockpit/studio shows hub with fixture entity in fixture mode
- Link opens /cockpit/studio/550e8400-e29b-41d4-a716-446655440001 editor
- npm run lint passes for touched files

Report back: files changed, commit hash, manual test notes, blockers.
```

---

### Card P8-HOTFIX-C — Agent UI Reports hub (Wave 1 — ARCHIVED)

```text
You are the Zeref UI agent for slice P8-HOTFIX-C.

HARD RULE
- Implement ONLY apps/web/components/reports/** and apps/web/app/cockpit/reports/page.tsx.
- Do NOT edit packages/**, apps/worker/**, or API routes.
- getReportArtifact already exists in apps/web/lib/cockpit-bff.ts — import only, do not modify BFF.
- STOP with report + blockers.

Skills: using-superpowers, brainstorming, ui-ux-pro-max, test-driven-development, verification-before-completion

Read first:
1. docs/CURRENT_STATE.md — P8 hotfix root cause
2. apps/web/app/cockpit/research/page.tsx — hub template
3. apps/web/components/cockpit/ReportsPanel.tsx
4. getReportArtifact in apps/web/lib/cockpit-bff.ts (read-only)
5. Fixture artifact id: 550e8400-e29b-41d4-a716-446655440000

Env: ZEREF_BFF_FIXTURE=1, ZEREF_PHASE8_PRODUCT=1

Deliverables
1. ReportsHub — lists slices.panels.reports.items
2. ReportArtifactDetail — when ?artifact= set, server-fetch via getReportArtifact (RSC); headline + JSON sections read-only
3. /cockpit/reports — VoiceHudShell + CockpitGrid focus="reports" + hub/detail
4. data-testid="reports-hub", "report-artifact-detail"
5. Remove placeholder “Artifact detail loads via GET…” text

Allowed: apps/web/components/reports/**, apps/web/app/cockpit/reports/page.tsx
Forbidden: packages/**, apps/worker/**, apps/web/lib/**, apps/web/app/api/**

Acceptance
- /cockpit/reports loads hub in fixture mode
- /cockpit/reports?artifact=550e8400-e29b-41d4-a716-446655440000 shows detail
- npm run lint passes for touched files

Report back: files changed, commit hash, manual test notes, blockers.
```

---

### Card P8-HOTFIX-E — Agent Docs/QA verify (COMPLETED — Wave 2)

Report: cockpit-studio-hub + cockpit-reports-hub e2e; verify-hotfix-p8.mjs; CI step after Phase 9; verify.md section. **Commit:** `e7908d1`

---

### Card P8-HOTFIX-E — Agent Docs/QA verify (Wave 2 — ARCHIVED)

```text
You are the Zeref QA agent for slice P8-HOTFIX-E.

HARD RULE
- scripts/**, apps/web/e2e/**, package.json (verify:hotfix-p8 script only), .github/workflows/ci.yml (hotfix step), docs/governance/verify.md ONLY.
- No product component edits.
- STOP with report when verify:hotfix-p8 green and verify:phase-9 still green.

Skills: run-verify-gate, verification-before-completion

Read first:
1. P8-HOTFIX-B + P8-HOTFIX-C worker reports
2. scripts/verify-phase-8.mjs — chain pattern
3. apps/web/e2e/cockpit-research-9.spec.ts — Wave 4 enforcement pattern

Deliverables
1. apps/web/e2e/cockpit-studio-hub.spec.ts — studio-hub visible on /cockpit/studio
2. apps/web/e2e/cockpit-reports-hub.spec.ts — reports-hub + artifact detail (?artifact= fixture id)
3. scripts/verify-hotfix-p8.mjs — chains verify:phase-8 + new e2e; ZEREF_BFF_FIXTURE=1, ZEREF_PHASE8_PRODUCT=1
4. Root package.json script verify:hotfix-p8
5. CI step after Verify Phase 9 (or document as pre-Phase-10 gate in verify.md)
6. docs/governance/verify.md — hotfix section

Allowed: scripts/verify-hotfix-p8.mjs, apps/web/e2e/cockpit-studio-hub.spec.ts, apps/web/e2e/cockpit-reports-hub.spec.ts, package.json (script), .github/workflows/ci.yml, docs/governance/verify.md
Forbidden: apps/web/components/**, apps/web/app/**, packages/**

Acceptance
- npm run verify:hotfix-p8 green
- npm run verify:phase-9 still green (full env — document if user runs locally)

Report back: verify log tail, CI diff, blockers.
```

---

### Card P9-A — Agent Contracts + Data + Worker (COMPLETED — Wave 1)

Report: contracts 85/85 (7 phase-9), analytics 3, worker fixture 3; migration `0004_phase9_research.sql`; fixtures `fixtures/phase-9/`. **Commit:** `67e606e`

---

### Card P6.1-A — Agent UI Visual Polish (COMPLETED — Wave 1)

Report: HUD chrome C91–C95; screenshot `docs/design/reference/screenshots/zeref-cockpit-6.1-hud.png`; build green. **Commit:** `f6a3d01`

---

### Card P9-B — Agent BFF (COMPLETED — Wave 2)

Report: 8/8 phase-9-routes; phase9-cockpit-v1; Amendment L enqueue. **Commit:** `c5032f4` (Lead: enqueue route V9 + TS fix).

---

### Card P9-E — Agent Docs/QA scaffold (COMPLETED — Wave 2)

Report: `verify-phase-9.mjs` shell; `cockpit-research-9.spec.ts` scaffold. **Commit:** `b38aa55`

---

### Card P6.1-E — Agent Docs/QA (COMPLETED — Wave 2)

Report: `verify-phase-6.1.mjs`; `cockpit-hud-6.1.spec.ts` C91–C94; CI step. **Commit:** `b38aa55`

---

### Card P9-B — Agent BFF (Wave 2 — SPAWN NOW after P9-A integration)

```text
You are the Zeref BFF agent for Phase 9 slice P9-B.

HARD RULE
- BFF research routes + phase9-cockpit-v1 slices ONLY. Wire to P9-A schemas.
- STOP with report + route test output.

Skills: using-superpowers, test-driven-development, verification-before-completion

Read first:
1. docs/governance/phase-9-contract.md (C84–C86, Amendment L)
2. docs/governance/adr/ADR-032-research-worker-bff.md
3. P9-A commit — contracts, fixtures, migration
4. apps/web/lib/studio-bff.ts, calendar-bff.ts, cockpit-bff.ts (patterns)
5. apps/web/lib/jobs/enqueue-job.ts — extend allowlist for `research`

Deliverables
1. apps/web/lib/research-bff.ts — fixture + DB paths
2. GET/POST /api/v1/research/topics, GET /api/v1/research/topics/[id]/route.ts
3. loadCockpitSlices() → phase9-cockpit-v1
4. enqueue-job.ts — Amendment L: allow `research`
5. apps/web/test/phase-9-routes.test.mjs

Allowed: apps/web/lib/research-bff.ts, apps/web/lib/cockpit-bff.ts, apps/web/lib/jobs/enqueue-job.ts, apps/web/app/api/v1/research/**, apps/web/test/phase-9-routes.test.mjs
Forbidden: apps/web/components/**, packages/db/**, apps/worker/**

Acceptance: node --test apps/web/test/phase-9-routes.test.mjs (fixture mode)
Report back: files, test output, integration notes for P9-C.
```

---

### Card P9-E — Agent Docs/QA scaffold (Wave 2 — parallel with P9-B)

```text
You are the Zeref Docs/QA agent for Phase 9 slice P9-E (Wave 2 scaffold).

HARD RULE
- scripts/verify-phase-9.mjs shell + CI step + e2e scaffold ONLY. No components.
- STOP with report. Playwright may skip until Wave 4.

Skills: using-superpowers, run-verify-gate, verification-before-completion

Read first:
- docs/governance/phase-9-contract.md (C90)
- scripts/verify-phase-8.mjs (pattern)
- docs/governance/adr/ADR-018-verify-phase-5-harness.md

Deliverables
1. scripts/verify-phase-9.mjs — chain verify:phase-8 + phase-9 static checks
2. package.json verify:phase-9 script
3. CI env: ZEREF_PHASE9_RESEARCH=1 (+ Phase 8 flags)
4. apps/web/e2e/cockpit-research-9.spec.ts scaffold (skip until ZEREF_PHASE9_RESEARCH=1 enforced in Wave 4)

Allowed: scripts/verify-phase-9.mjs, package.json (script only), .github/workflows/ci.yml, apps/web/e2e/cockpit-research-9.spec.ts, docs/governance/verify.md
Forbidden: apps/web/components/**, apps/web/app/api/**

Acceptance: verify shell runs; documents Wave 4 deferrals
Report back: CI diff, verify output snippet.
```

---

### Card P6.1-E — Agent Docs/QA (Wave 2 — after P6.1-A)

```text
You are the Zeref Docs/QA agent for Phase 6.1 slice P6.1-E.

HARD RULE
- verify:phase-6.1 + Playwright C91–C94 ONLY. No HUD component edits.

Skills: using-superpowers, run-verify-gate, verification-before-completion

Read first:
- docs/governance/phase-6.1-contract.md (C96–C98)
- docs/governance/adr/ADR-033-luke-tier2-visual-acceptance.md
- scripts/verify-phase-5.1.mjs (pattern)

Deliverables
1. scripts/verify-phase-6.1.mjs — chain verify:phase-5.1 + C91–C94 checks
2. package.json verify:phase-6.1 script
3. apps/web/e2e/cockpit-hud-6.1.spec.ts (or extend cockpit-hud-5.1.spec.ts)
4. CI step with ZEREF_PHASE61_UI=1

Allowed: scripts/verify-phase-6.1.mjs, package.json, .github/workflows/ci.yml, apps/web/e2e/cockpit-hud-6.1.spec.ts, docs/governance/verify.md
Forbidden: apps/web/components/**

Acceptance: npm run verify:phase-6.1 (document if Playwright needs P6.1-A screenshot first)
Report back: verify output, CI diff.
```

---

### Card P9-C — Agent UI Research (COMPLETED — Wave 3)

Report: ResearchHub + ResearchTopicDetail; RSC hub/detail via listResearchTopics/getResearchTopic; screenshot `zeref-cockpit-research-hub.png`. **Commit:** Lead merge 2026-06-06

---

### Card P9-E — Agent Docs/QA finalize (Wave 4 — COMPLETED 2026-06-08)

```text
(Done — wave4ResearchUiReady=true; verify-phase-9 hard-fails on cockpit-research-9 Playwright non-zero; CI Phase 0–9 gate confirmed)
```

---

### Card P8-A — Agent Contracts + Data (COMPLETED)

Commit: `12a0e65`

```text
(Done — see git log for P8-A commit after Lead integration)
```

---

### Card P8-B — Agent BFF (COMPLETED @ `10240c3`)

```text
(Done — studio/calendar/enqueue routes, enqueue-job.ts, phase8-cockpit-v1 slices, phase-8-routes tests 10/10)
```

---

### Card P8-E — Agent Docs/QA (Wave 2 scaffold — COMPLETED)

Commit: `7678cee`

```text
(Done — verify:phase-8 script, CI Phase 0–8 gate, e2e scaffolds skipped until Wave 4)
```

---

### Card P8-C — Agent UI Studio (SPAWN NOW — parallel with P8-D)

```text
You are the Zeref UI agent for Phase 8 slice P8-C.

HARD RULE
- Studio editor UI + e2e ONLY. Wire to BFF from P8-B.
- STOP with report + screenshot.

Skills: using-superpowers, brainstorming, ui-ux-pro-max, test-driven-development, verification-before-completion

Read first (mandatory):
1. docs/SKILL_INVOCATION.md
2. docs/CURRENT_STATE.md
3. docs/design/DESIGN_SYSTEM.md
4. docs/governance/phase-8-contract.md (C75, C77, C78)
5. apps/web/components/cockpit/StudioPanel.tsx, CockpitShell.tsx, CockpitGrid.tsx
6. apps/web/lib/bff.ts — getCockpitSlices() returns CockpitSlicesV8
7. apps/web/app/cockpit/studio/page.tsx
8. P8-B @ 10240c3 — PUT /api/v1/studio/drafts/:entityId

Repo: c:\Projects\zeref

Binding (from P8-B council note):
- Update CockpitShell/CockpitGrid (and related) types: CockpitSlices → CockpitSlicesV8 from @zeref/contracts
- Use phase8 panel item fields: hasDraft, draftPreview, status, scheduledAt where shown

Deliverables
1. /cockpit/studio/[entityId] — editor page, data-testid="studio-editor"
2. StudioPanel links to entity editor
3. Draft save via PUT /api/v1/studio/drafts/:entityId
4. RSC-first — no client refetch storm (C77)
5. apps/web/e2e/cockpit-studio-8.spec.ts (skip until ZEREF_PHASE8_PRODUCT=1 if P8-E not ready)

Allowed: apps/web/components/**, apps/web/app/cockpit/studio/**, apps/web/e2e/**
Forbidden: apps/web/app/api/**, packages/db/**

Acceptance: manual editor flow + e2e when P8-E enables flag
Report back: files, screenshot path, test output.
```

---

### Card P8-D — Agent UI Calendar (SPAWN NOW — parallel with P8-C)

```text
You are the Zeref UI agent for Phase 8 slice P8-D.

HARD RULE
- Calendar scheduler UI + e2e ONLY. Wire to BFF from P8-B.
- STOP with report + screenshot.

Skills: using-superpowers, brainstorming, ui-ux-pro-max, test-driven-development, verification-before-completion

Read first (mandatory):
1. docs/SKILL_INVOCATION.md
2. docs/CURRENT_STATE.md
3. docs/design/DESIGN_SYSTEM.md
4. docs/governance/phase-8-contract.md (C76, C77, Q5)
5. apps/web/components/cockpit/CalendarPanel.tsx, CockpitShell.tsx
6. apps/web/lib/bff.ts — CockpitSlicesV8
7. apps/web/app/cockpit/calendar/page.tsx
8. P8-B @ 10240c3 — calendar CRUD + POST /api/v1/jobs/enqueue

Repo: c:\Projects\zeref

Binding: Align CockpitSlices → CockpitSlicesV8 in cockpit components (same as P8-C).

Deliverables
1. Full calendar scheduler view — data-testid="calendar-scheduler"
2. Create/edit events via BFF calendar routes
3. Manual enqueue trigger when scheduledAt <= now (Q5 MVP — no cron daemon)
4. Honest scheduler-absent badge when applicable
5. apps/web/e2e/cockpit-calendar-8.spec.ts

Allowed: apps/web/components/**, apps/web/app/cockpit/calendar/**, apps/web/e2e/**
Forbidden: apps/web/app/api/**, packages/db/**

Acceptance: manual scheduler flow + e2e when P8-E enables flag
Report back: files, screenshot path, test output.
```

---

### Card P8-E — Agent Docs/QA (Wave 2 scaffold → Wave 4 finalize)

```text
You are the Zeref Docs/QA agent for Phase 8 slice P8-E.

HARD RULE
- scripts/verify-phase-8.mjs, CI, e2e, governance docs ONLY. No apps/web/components/**.
- STOP with report when done.

Skills: using-superpowers, run-verify-gate, verification-before-completion

Read first:
- docs/governance/phase-8-contract.md (C80)
- scripts/verify-phase-7.mjs (pattern)
- docs/governance/adr/ADR-018-verify-phase-5-harness.md

Wave 2: verify shell + CI step (Playwright may skip).
Wave 4: cockpit-studio-8.spec.ts + cockpit-calendar-8.spec.ts enforced.

Deliverables
1. scripts/verify-phase-8.mjs — chain verify:phase-0 … verify:phase-7 + phase-8 checks
2. package.json verify:phase-8 script
3. CI env: ZEREF_PHASE8_PRODUCT=1, ZEREF_JOB_ENQUEUE_MOCK=1, ZEREF_BFF_FIXTURE=1
4. e2e specs scaffolded; enforced after P8-C + P8-D

Acceptance: npm run verify:phase-8 (document deferrals in Wave 2)
Report back: CI diff, verify output, commit hash.
```

---

### Card P7-A — Agent Memory + Schema (COMPLETED)

```text
You are the Zeref Memory + Schema agent for Phase 7 slice P7-A.

HARD RULE
- Implement ONLY: packages/zeref-memory/**, packages/contracts/src/phase7/**, packages/db migrations for memory tables, fixtures/phase-7/**, package.json workspace entries.
- Do NOT edit apps/web/**, packages/jarvis-kernel/**, scripts/worker.mjs, or BFF routes.
- When done, STOP and post a report. Do not claim Planner sign-off.

Skills — invoke before acting:
1. using-superpowers
2. test-driven-development
3. council-review-slice (schema changes)
4. verification-before-completion

Read first (mandatory):
1. docs/SKILL_INVOCATION.md
2. docs/CURRENT_STATE.md
3. docs/failures-checklist.md
4. docs/governance/phase-7-contract.md (Q1, C61–C64, Amendment B outbox table name)
5. docs/governance/adr/ADR-025-memory-postgres-schema.md
6. packages/db (existing migration pattern)
7. packages/contracts/src/phase6/ (pattern for phase7 schemas)

Repo: c:\Projects\zeref

Deliverables
1. packages/zeref-memory/ — package scaffold with:
   - saveMemory, searchMemory, verifyMemory
   - entity CRUD: createEntity, updateEntity, queryEntities, relateEntities
   - autoTierClassifier(text, context) → episodic|semantic|project|procedural
   - temporalScore(createdAt) — 30-day half-life
   - ruleBasedContradictionCheck on save (same entity_id + conflicting value → contradicted)
   - Postgres adapter + ZEREF_MEMORY_MOCK=1 in-memory/fixture adapter
2. packages/contracts/src/phase7/ — MemoryEntrySchema, MemorySearchResultSchema, MemoryEntitySchema, MemoryBrainEventSchema, CockpitSseOutboxSchema, PHASE7_CONTRACT_VERSION = "7.0.0"
3. packages/db migrations — memory_entries, memory_entities, memory_relations, memory_observations, cockpit_sse_outbox (for ADR-027; schema only — worker INSERT is P7-C scope)
4. fixtures/phase-7/ — sample memories + search results for mock mode
5. Unit tests — npm test -w @zeref/zeref-memory with ZEREF_MEMORY_MOCK=1

Allowed paths
- packages/zeref-memory/**
- packages/contracts/src/phase7/**
- packages/contracts/test/** (phase-7 tests)
- packages/db/** (memory + outbox migrations)
- fixtures/phase-7/**
- package.json / package-lock.json (workspace dep entries only)

Forbidden
- apps/web/**
- packages/jarvis-kernel/**
- scripts/**

Acceptance
- npm run build -w @zeref/contracts
- npm test -w @zeref/zeref-memory
- npm test -w @zeref/contracts (new phase-7 tests)
- Migration SQL applies (document manual: npm run db:migrate or project equivalent)

Report back: commit hash, API surface, migration file names, test output, env vars, blockers.
```

### Card P7-B — Agent Kernel (Wave 2 — after P7-A report)

```text
You are the Zeref Kernel agent for Phase 7 slice P7-B.
HARD RULE: packages/jarvis-kernel memory tools ONLY. Read P7-A API first.
Deliverables: memory_search, memory_save tools; Amendment C keyword routing; slow-path only.
Acceptance: npm test -w @zeref/jarvis-kernel with ZEREF_MEMORY_MOCK=1.
STOP with report.
```

### Card P7-C — Agent BFF + Outbox (Wave 2 — after P7-A report)

```text
You are the Zeref BFF agent for Phase 7 slice P7-C.
HARD RULE: BFF + worker outbox INSERT hook ONLY. No UI components.
Deliverables: getCockpitEventBus (Amendment A); memory.* SSE; cockpit_sse_outbox drain; worker job-complete INSERT.
Read ADR-027. Optional GET /api/v1/memory/search?q= read-only.
Acceptance: npm test -w @zeref/web.
STOP with report.
```

### Card P7-D — Agent UI Brain States (Wave 3 — after P7-B + P7-C)

```text
You are the Zeref UI agent for Phase 7 slice P7-D.
HARD RULE: globe + TelemetryStrip + e2e ONLY.
Deliverables: data-globe-brain-state; SSE memory.* subscription; jarvis-orb reaction mapping (no bloom).
Acceptance: manual + e2e with ZEREF_PHASE7_BRAIN=1 when P7-E ready.
STOP with report + screenshot.
```

### Card P7-E — Agent Docs/QA (Wave 2 scaffold → Wave 4 finalize)

```text
You are the Zeref Docs/QA agent for Phase 7 slice P7-E.
HARD RULE: scripts/verify-phase-7.mjs, CI, e2e, governance docs ONLY.
Wave 2: verify shell + CI step (Playwright may skip). Wave 4: cockpit-brain-7.spec.ts enforced.
Acceptance: npm run verify:phase-7 with ZEREF_MEMORY_MOCK=1 + ZEREF_PHASE7_BRAIN=1.
STOP with report.
```

---

## COMPLETED — P6-HOTFIX-A (audible TTS mock)

| Slice | Scope |
|-------|--------|
| P6-HOTFIX-A | `fixtures/phase-6/tts-mock.wav` 440 Hz tone; kernel RMS test; ADR-022/README note |

## COMPLETED — P6-HOTFIX-B (voice-routes fixture)

| Slice | Scope |
|-------|--------|
| P6-HOTFIX-B | `apps/web/test/voice-routes.test.mjs` audible `createMinimalWav()` + sync-mock RMS assertions @ `358d757` |

---

## READY — Phase 6 Wave 3 (P6-C + P6-E merged — spawn P6-D UI)

**Merged:** P6-C @ `4171e14`, P6-E @ `2cbe98b`  
**Order:** P6-D UI only → then enable `ZEREF_PHASE6_VOICE=1` in CI

---

### Card P6-A — Agent Whisper (run FIRST; parallel with B)

```text
You are the Zeref Whisper STT agent for Phase 6 slice P6-A.

HARD RULE
- Implement ONLY apps/whisper sidecar. No BFF, UI, or jarvis-kernel.
- When done, STOP and post a report. Do not claim Planner sign-off.

Skills — invoke before acting:
1. using-superpowers
2. test-driven-development
3. verification-before-completion

Read first:
- docs/SKILL_INVOCATION.md
- docs/CURRENT_STATE.md
- docs/failures-checklist.md
- docs/governance/phase-6-contract.md (Q1, C51)
- docs/governance/adr/ADR-020-whisper-stt-sidecar.md

Repo: c:\Projects\zeref

Deliverables
1. apps/whisper/ — Python faster-whisper sidecar
2. GET /health — { ok, model }
3. POST /v1/transcribe — multipart audio → { text, language?, durationMs? }
4. README — install, model download, start on 127.0.0.1:8765
5. Optional: docker-compose service snippet in docs (not required for CI)

Allowed paths
- apps/whisper/**
- docs/** (whisper section only)

Forbidden
- apps/web/**
- packages/jarvis-kernel/**
- packages/contracts/** (BFF/Kernel own schemas)

Acceptance
- curl health when sidecar running
- sample transcribe with tiny wav fixture (document manual step)
- Document ZEREF_WHISPER_MOCK=1 expectation for BFF (no sidecar in CI)

Report back: file list, curl samples, README path, blockers.
```

---

### Card P6-B — Agent Kernel (run FIRST; parallel with A)

```text
You are the Zeref Jarvis Kernel agent for Phase 6 slice P6-B.

HARD RULE
- Implement packages/jarvis-kernel + phase6 contracts only. No UI or whisper app.
- STOP with report when done.

Skills — invoke before acting:
1. using-superpowers
2. test-driven-development
3. council-review-slice (schema changes)

Read first:
- docs/SKILL_INVOCATION.md
- docs/governance/phase-6-contract.md (Q2–Q4, C52–C53, C56)
- docs/governance/adr/ADR-021-jarvis-kernel-two-phase-speak.md
- docs/governance/adr/ADR-022-elevenlabs-tts-mock.md

Repo: c:\Projects\zeref

Deliverables
1. packages/jarvis-kernel — processTurn() with fast Phase A ack (must NOT await full tool/LLM)
2. Two-phase speak: ackText (fast) + resultText (after tools/LLM)
3. Tool registry (Amendment B): get_cockpit_summary, get_latest_report_headline, get_pipeline_status
4. ElevenLabs TTS adapter + OpenAI fallback + ZEREF_TTS_MOCK=1 fixture audio
5. packages/contracts/src/phase6/ — JarvisTurn*, Voice* schemas incl VoiceAudioEventSchema, PHASE6_CONTRACT_VERSION
6. Unit tests — mock LLM + mock TTS; ack returns before slow path

Allowed
- packages/jarvis-kernel/**
- packages/contracts/src/phase6/**
- packages/contracts/test/** (phase-6 tests)
- fixtures/phase-6/**

Forbidden
- apps/web/components/**
- apps/whisper/** (P6-A)
- apps/worker/** job handlers

Acceptance
- npm run build -w @zeref/contracts
- npm test -w @zeref/jarvis-kernel (or package test script)
- npm test -w @zeref/contracts (new phase-6 tests)

Report back: commit hash, API surface, test output, env vars list.
```

---

### Card P6-C — Agent BFF/Voice (run AFTER A + B; parallel with E)

```text
You are the Zeref BFF/Voice agent for Phase 6 slice P6-C.

HARD RULE
- BFF routes + SSE extension + server lib only. No UI components.
- STOP with report when done.

Skills — invoke before acting:
1. using-superpowers
2. test-driven-development
3. council-review-slice

Read first:
- docs/governance/phase-6-contract.md (C54, C60, Amendment A)
- docs/governance/adr/ADR-024-live-sse-voice-events.md
- docs/governance/adr/ADR-019-telemetry-sse-stub.md
- apps/web/app/api/v1/events/stream/route.ts (extend, do not duplicate URL)
- packages/jarvis-kernel/src/process-turn.ts (processTurn / processTurnSync)
- docs/WHISPER_SIDECAR.md

Repo: c:\Projects\zeref

P6-B integration (binding):
- Add "@zeref/jarvis-kernel": "0.0.0" to apps/web/package.json (BFF routes only)
- Live: processTurn() → emit handle.ack + TTS ack on SSE immediately; await handle.complete in background
- CI mock (all flags): processTurnSync() → 200 JSON with both audio blobs
- defaultTtsAdapter(text, { phase: 'ack' | 'result' })
- Implement apps/web/lib/voice/voice-event-bus.ts (globalThis singleton pub/sub) so /voice/turn emits to open SSE clients

Deliverables
1. POST /api/v1/voice/turn — Amendment A:
   - Live/dev: 202 { turnId, transcript } after STT; ack+result via SSE (voice.audio, voice.transcript, voice.state)
   - CI mock: 200 sync JSON with both audio blobs when ZEREF_WHISPER_MOCK=1 + ZEREF_TTS_MOCK=1 + ZEREF_LLM_MOCK=1
2. GET /api/v1/voice/health — sidecar reachability + mock flags
3. Extend GET /api/v1/events/stream — subscribe to voice-event-bus + keep telemetry heartbeat
4. apps/web/lib/voice/** — whisper-client (127.0.0.1:8765 or WHISPER_MOCK), mock switches
5. Route handler tests with all mock flags

Allowed
- apps/web/app/api/v1/voice/**
- apps/web/app/api/v1/events/**
- apps/web/lib/voice/**
- apps/web/test/** (voice route tests)

Forbidden
- apps/web/components/**
- apps/whisper/** (except README cross-link)

Acceptance
- npm test -w @zeref/web (new voice tests)
- curl sample for /voice/turn with fixture audio in mock mode

Report back: routes, curl transcript, SSE sample lines, test output.
```

---

### Card P6-E — Agent Docs/QA (run parallel with C)

```text
You are the Zeref Docs/QA agent for Phase 6 slice P6-E.

HARD RULE
- verify script + CI + governance docs only. No apps/web/components/**.
- STOP with report when done.

Skills — invoke before acting:
1. using-superpowers
2. run-verify-gate
3. verification-before-completion

Read first:
- docs/governance/phase-6-contract.md (C59)
- scripts/verify-phase-5.1.mjs (pattern)
- docs/governance/adr/ADR-018-verify-phase-5-harness.md

Repo: c:\Projects\zeref

Deliverables
1. scripts/verify-phase-6.mjs — chain verify:phase-0 … verify:phase-5.1 + phase-6 checks
2. package.json — verify:phase-6 script
3. .github/workflows/ci.yml — Phase 0–6 gate; env: ZEREF_TTS_MOCK=1, ZEREF_WHISPER_MOCK=1, ZEREF_PHASE6_VOICE=1
4. apps/web/e2e/cockpit-voice-6.spec.ts — PTT + globe voice state (skip until ZEREF_PHASE6_VOICE=1)
   Document testid table for P6-D: ptt-button, audio-io-live, data-globe-voice-state, turnId optional
5. docs/governance/adr/README.md — Phase 6 ADR index
6. Update C30 guard in verify scripts: allow server-side jarvis-kernel; still forbid browser imports

Allowed
- scripts/verify-phase-6.mjs
- .github/workflows/ci.yml
- docs/governance/**
- package.json (verify script)
- apps/web/e2e/cockpit-voice-6.spec.ts

Forbidden
- apps/web/components/**

Acceptance
- node scripts/verify-phase-6.mjs (document pre-UI deferral if needed)

Report back: CI diff, verify output, C59 testid table for UI agent.
```

---

### Card P6-D — Agent UI (run AFTER C + E reports)

```text
You are the Zeref UI agent for Phase 6 slice P6-D.

HARD RULE
- PTT, live AUDIO I/O, globe voice states, Playwright only. Wire to BFF /voice/turn from P6-C.
- No OpenRouter in browser. STOP with report + screenshot.

Skills — invoke before acting:
1. using-superpowers
2. brainstorming
3. ui-ux-pro-max
4. test-driven-development
5. verification-before-completion

Read first:
- docs/design/reference/lukebuildsai-jarvis-hud.jpeg
- docs/governance/phase-6-contract.md (C55–C58)
- docs/governance/adr/ADR-023-globe-voice-states.md
- apps/web/components/hud/AudioIoPlaceholder.tsx (replace simulated path)
- apps/web/components/globe/GlobeIsland.tsx

Repo: c:\Projects\zeref

Deliverables
1. PttButton — data-testid=ptt-button, hold-to-talk, MediaRecorder → POST /api/v1/voice/turn
2. VoiceController — subscribe to SSE voice.audio (ack before result); playback order per Amendment A
3. Live AudioIO — mic level + output meter, data-testid=audio-io-live; hide audio-io-simulated when live
4. GlobeIsland/GlobeCanvas — data-globe-voice-state; thinking = opacity pulse only (ADR-023 Amendment C)
5. TelemetryStrip — remove SIMULATED when SSE live events received
6. Optional: conversation transcript panel under globe (ack + result lines)
7. apps/web/e2e/cockpit-voice-6.spec.ts + cockpit-layout updates per QA spec
8. docs/design/DESIGN_SYSTEM.md — voice UX notes

Allowed
- apps/web/components/**
- apps/web/app/cockpit/**
- apps/web/app/globals.css
- apps/web/e2e/**

Forbidden
- apps/web/app/api/** (BFF agent)
- packages/jarvis-kernel/** direct import in client components
- apps/whisper/**

Acceptance
- npm run verify:phase-6 with ZEREF_PHASE6_VOICE=1 + mock flags
- Playwright voice spec green

Report back: files changed, verify output, screenshot path, globe state demo notes.
```

---

## COMPLETED — Phase 6 Wave 2

| Slice | Scope |
|-------|--------|
| P6-C BFF/Voice | `/api/v1/voice/*`, SSE bus, `@zeref/jarvis-kernel` wiring |
| P6-E Docs/QA | `verify:phase-6`, CI Phase 0–6, `cockpit-voice-6.spec.ts` |

---

## COMPLETED — Phase 6 Wave 1

| Slice | Commit |
|-------|--------|
| P6-A Whisper | `7cd1f2b` |
| P6-B Kernel | `d1a1063` |

---

## COMPLETED — Phase 5.1

Planner approved; implementation @ `838e34d` + BFF/QA merges. See git log and `docs/CURRENT_STATE.md`.

<details>
<summary>Phase 5.1 cards (archived)</summary>

See git history @ `c40506a` for P5.1-A/B/C prompts.

</details>

---

## COMPLETED — Phase 5.0.x / Phase 5

See `docs/CURRENT_STATE.md` and git log @ `568a5fc`.

---

## Template (blank)

See [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md).
