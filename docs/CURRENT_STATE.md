# Zeref — Current State

**Last updated:** 2026-06-14 (Phase 10 council merge — P10-A/B/E reported; commits pending B+E)  
**Status owner:** Lead orchestrator (update after every phase gate or Planner sign-off)

**Read first in any new chat:** this file → [LEAD_ORCHESTRATOR.md](./LEAD_ORCHESTRATOR.md) → [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md)

Also see `.planning/STATE.md` for commit SHAs; **this file is runtime truth for agents.**

---

## Executive summary

| Area | Status |
|------|--------|
| Phases 0–5 implementation | **DONE** (verify green in CI @ `568a5fc`) |
| Phase 5 Planner sign-off | **APPROVED** (scaffold) |
| Agent stack (GSD, council, uipro, Superpowers) | **DONE** |
| Phase 5.0.1 ops | **DONE** (2026-05-30) |
| Phase 5.0.2 dev perf + BFF loopback | **DONE** (2026-05-30) |
| Phase 5.1 Luke JARVIS HUD visual | **APPROVED** @ `abb9dec` (CI Phase 0–5.1 green) |
| Phase 6 Jarvis voice | **APPROVED** @ `183acf9` + hotfixes; screenshot @ `3020d1e` (2026-05-31) |
| P6-HOTFIX-A audible TTS mock | **DONE** @ `9c5869f` — 440 Hz `tts-mock.wav` for UAT |
| P6-HOTFIX-B voice-routes fixture | **DONE** @ `358d757` — web tests no longer overwrite fixture to silence |
| Phase 7 zeref-memory + brain | **APPROVED** @ `0e7f8d5` (verify @ `0461bc1`; sign-off 2026-06-03) |
| Phase 8 Studio + Calendar | **APPROVED** @ `e5dc5b6` (`verify:phase-8` green 2026-06-03) |
| Phase 9 Research pipelines | **APPROVED** @ `9960c92` — CI Phase 0–9 green; research e2e 2/2 enforced |
| Phase 6.1 Luke visual polish | **P6.1-E DONE** — `verify:phase-6.1` green; Planner visual sign-off pending |
| **P8 hotfix (Studio/Reports hubs)** | **CLOSED** @ `e7908d1` — B `f52e0ef`, C `019e7bd`, E verify + CI; `verify:hotfix-p8` green |
| Phase 6.2 Visual Tier 3 | **PLANNING** — P6.2-A **MAY** parallel P10 Wave 1 (Amendment Q); P6.2-B after P10 sign-off |
| Phase 10 Live Ops & Pipeline Truth | **IN PROGRESS** — P10-A @ `45880e6`; P10-B + P10-E **reported, uncommitted**; `verify:phase-10` scoped checks green |

**Immediate goal:** Commit P10-B + P10-E working tree → push `main` → user runs full `verify:phase-10` on idle machine. Triage **cockpit-brain-7 C69** flake (pre-existing; blocks full hotfix chain). Optional **P10-F** wire `isOutboxDrainAllowed()` into `events/stream` for full C117.

### P8 hotfix root cause

`/cockpit/studio` and `/cockpit/reports` render **CockpitShell only** (grid). Calendar/Research work because they add a **hub below the grid**. Studio/Reports deep links feel broken — no hub surface.

**Exit gate (before Phase 10):**

- `/cockpit/studio` — `StudioHub` + links to entity editor
- `/cockpit/reports` — `ReportsHub` + artifact detail for `?artifact=`
- `verify:phase-8` still green
- `verify:hotfix-p8` green (new)

---

## Pipeline (as built)

```
collect → normalize → embed → analyze → report
```

| Stage | Package / app | Queue job | Auto-chain |
|-------|---------------|-----------|------------|
| collect | `@zeref/worker`, `@zeref/instagram` | `collect` | none |
| normalize | `@zeref/worker` | `normalize` | → embed inline if `ZEREF_AUTO_EMBED` |
| embed | `@zeref/worker` | `embed` | — |
| analyze | `@zeref/worker`, `@zeref/analytics` | `analyze` | → report inline if `ZEREF_AUTO_REPORT` |
| report | `@zeref/worker`, `@zeref/reports` | `report` | — |

**Ops (Phase 10):**

| Deliverable | Status |
|-------------|--------|
| `npm run dev:stack` / root `npm run dev` + `ZEREF_WORKER_AVAILABLE=1` on web | **DONE** @ `45880e6` (P10-A) |
| `GET /api/v1/ops/worker-health` `{ consuming, source }` | **DONE** (P10-B, uncommitted) — fixture: `{ consuming: false, source: "fixture" }`; live: `{ consuming: true, source: "pg-boss" }` |
| Pipeline SSE honesty (outbox drain → `simulated: false`) | **PARTIAL** — unit tests green; **`events/stream` not yet gated** on `isOutboxDrainAllowed()` (P10-F follow-up) |
| `npm run verify:phase-10` | **LANDED** (P10-E, uncommitted) — Phase 10 checks pass; **full chain flaky** on nested `cockpit-brain-7` C69 (237–1066ms vs ≤150ms) |

Web-only: **`npm run dev -w @zeref/web`** — no queue consumer, simulated pipeline only. See [phase-10-contract.md](./governance/phase-10-contract.md) · [DEV_PERFORMANCE.md](./DEV_PERFORMANCE.md) § Operator UAT.

---

## Cockpit (Phase 5)

| Deliverable | Status |
|-------------|--------|
| `/cockpit` layout (Studio, Calendar \| Globe \| Reports, Research) | **DONE** |
| BFF `GET /api/v1/cockpit/slices` | **DONE** (fixture mode in CI) |
| Wireframe icosahedron globe | **SUPERSEDED** — point-cloud + rings @ `838e34d` (ADR-015 amendment) |
| Luke HUD shell + SIMULATED telemetry/AUDIO | **DONE** @ `838e34d` |
| Playwright 16/16 (layout + C48) | **DONE** with `ZEREF_PHASE51_UI=1` |
| SSE stub `GET /api/v1/events/stream` | **DONE** (P5.1-B) |
| Voice / PTT / live AUDIO I/O | **DONE** @ `183acf9` |

---

## Verify baseline

| Gate | Local | CI |
|------|-------|-----|
| `verify:phase-0` … `verify:phase-4` | OK with `DATABASE_URL` | OK |
| `verify:phase-5` | OK with `ZEREF_BFF_FIXTURE=1` | OK — **no live DB BFF test** |
| `verify:phase-5.1` | OK with `ZEREF_BFF_FIXTURE=1` + `ZEREF_PHASE51_UI=1` | OK — C48 enforced |
| `verify:phase-6` | OK with mocks + `ZEREF_PHASE6_VOICE=1` | OK — C59 enforced after CI update |

### QA — Phase 5.1 verify (P5.1-C)

| Deliverable | Status |
|-------------|--------|
| `scripts/verify-phase-5.1.mjs` | **DONE** — chains `verify:phase-0` … `verify:phase-5` + C48 |
| `apps/web/e2e/cockpit-hud-5.1.spec.ts` | **DONE** — C48 testids |
| CI **Phase 0–5.1 gate** | **DONE** — `ZEREF_PHASE51_UI=1` on 5.1 step |

```powershell
cd c:\Projects\zeref
$env:ZEREF_LLM_MOCK='1'
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_PHASE51_UI='1'
npm run verify:phase-5.1
```

---

## Agent stack install (2026-05-30)

| Component | Status |
|-----------|--------|
| GSD Redux | **DONE** — `.cursor/skills/gsd-*`, `.cursor/get-shit-done/` |
| UI UX Pro Max | **DONE** — `.cursor/skills/ui-ux-pro-max/` |
| Council skills | **PARTIAL** — 4 skills in `.cursor/skills/council-*`, `run-verify-gate` |
| Council board YAML | **DONE** — `config/council/zeref-board.yaml` |
| Cursor rules `.mdc` | **DONE** — `.cursor/rules/` |
| phase_gate scripts | **DONE** — `scripts/phase_gate.ps1`, `phase_gate.sh` |
| Superpowers plugin | **USER** — `/add-plugin superpowers` |

---

### Phase 6 progress

| Slice | Status |
|-------|--------|
| P6-A Whisper | **DONE** @ `7cd1f2b` |
| P6-B Kernel | **DONE** @ `d1a1063` |
| P6-C BFF/Voice | **DONE** @ `4171e14` |
| P6-E Docs/QA | **DONE** @ `2cbe98b` |
| P6-D UI | **DONE** @ `183acf9` |
| P6-HOTFIX-A | **DONE** @ `9c5869f` — audible `tts-mock.wav` + kernel RMS test |
| P6-HOTFIX-B | **DONE** @ `358d757` — voice-routes audible fixture + RMS assertions |

```powershell
cd c:\Projects\zeref
$env:ZEREF_WHISPER_MOCK='1'; $env:ZEREF_TTS_MOCK='1'; $env:ZEREF_LLM_MOCK='1'
$env:ZEREF_BFF_FIXTURE='1'; $env:ZEREF_PHASE51_UI='1'; $env:ZEREF_PHASE6_VOICE='1'
npm run verify:phase-6
```

**Live Jarvis (your OpenRouter key):** edit `apps/web/.env.local` — set `OPENROUTER_API_KEY`, comment out `ZEREF_LLM_MOCK=1`, restart `npm run dev -w @zeref/web`, hold PTT on cockpit.

### Phase 7 progress

| Slice | Status |
|-------|--------|
| P7-A Memory + schema | **DONE** @ `93ef982` |
| P7-B Kernel memory tools | **DONE** @ `afffaef` |
| P7-C BFF + outbox | **DONE** @ `547103b` + hotfix @ `5084a9d` |
| P7-D UI brain states | **DONE** @ `0e7f8d5` |
| P7-E verify + CI | **DONE** @ `0461bc1` |
| Full `verify:phase-7` (local) | **GREEN** (2026-06-03) |

```powershell
cd c:\Projects\zeref
$env:ZEREF_WHISPER_MOCK='1'; $env:ZEREF_TTS_MOCK='1'; $env:ZEREF_LLM_MOCK='1'
$env:ZEREF_BFF_FIXTURE='1'; $env:ZEREF_PHASE51_UI='1'; $env:ZEREF_PHASE6_VOICE='1'
$env:ZEREF_MEMORY_MOCK='1'; $env:ZEREF_PHASE7_BRAIN='1'
npm run verify:phase-7
```

Screenshot: `docs/design/reference/screenshots/zeref-cockpit-7-brain.png` @ `0e7f8d5`

---

## Phase 8 — local dev UAT (fixture mode)

Studio entity pages return **404** when `ZEREF_BFF_FIXTURE` is unset and Postgres has no matching `normalized_entities` row. In fixture mode only this entity resolves:

| URL | Notes |
|-----|--------|
| `http://localhost:3000/cockpit` | Main cockpit (or your dev port) |
| `http://localhost:3000/cockpit/studio/550e8400-e29b-41d4-a716-446655440001` | Studio editor (`studio-editor`) |
| `http://localhost:3000/cockpit/calendar` | Calendar scheduler (`calendar-scheduler`) |

```powershell
cd c:\Projects\zeref
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_JOB_ENQUEUE_MOCK='1'
npm run dev -w @zeref/web
```

Restart dev after setting env vars. Link from `/cockpit` studio panel uses the same fixture entity id.

Screenshots: `zeref-studio-editor-p8c.png`, `zeref-calendar-scheduler-8.png`

**Verify:** `npm run verify:phase-8` **GREEN** (2026-06-03) @ `e5dc5b6` — Playwright reuse fix; full chain 0–8 + 25/25 e2e.

Screenshots: `zeref-studio-editor-p8c.png`, `zeref-calendar-scheduler-8.png`

---

## What's NEXT

| # | Owner | Task |
|---|-------|------|
| 1 | Lead | Integration commits P9-A + P6.1-A |
| 2 | User | Spawn **P9-B**, **P9-E scaffold**, **P6.1-E** (3 chats) |
| 3 | Planner | Visual sign-off on `zeref-cockpit-6.1-hud.png` |

---

## Do not start

- Phase 8 **UI** until **P8-B** integrated (closed @ `10240c3`)
- Phase 8 **BFF** without P8-A schemas (closed after P8-A commit)
- Phase 6 **Lead domain code** without agent reports (phase closed)
- Full-screen particle globe without ADR-015 amendment
- Fake scrolling telemetry (legacy ios theater pattern)

---

## Key paths

| Doc | Path |
|-----|------|
| Phase contracts | `docs/governance/phase-{0-8}-contract.md` |
| Verify | `docs/governance/verify.md` |
| Legacy lessons | `docs/handoff/legacy-ios.md` |
| Gap backlog | `docs/GAP_BACKLOG.md` |
| Ownership | `AGENTS.md` |
| Design system | `docs/design/DESIGN_SYSTEM.md` |
| Luke HUD ref | `docs/design/reference/lukebuildsai-jarvis-hud.jpeg` |
