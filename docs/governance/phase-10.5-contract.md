# Zeref — Phase 10.5 Contract (Stabilize & Instant)

**Phase:** 10.5  
**Status:** **APPROVED** (Lead orchestrator 2026-06-14)  
**Theme:** Stabilize & Instant — kill reconnect storms, singleton backend resources, instant cockpit feel. **No new product features.** Platform hardening before Phase 11 JARVIS.

**Prerequisites:** Phase 10 **APPROVED** @ `d8ce6c0`; `verify:phase-10` green on `main`. Phases 0–10 must **remain green**.

**References:** Master plan `zeref_master_plan_ab56bf3f.plan.md` (§6 Phase 10.5, §2–§4 root causes) · [phase-10-contract.md](./phase-10-contract.md) C117/C124 carry-forward · [DEV_PERFORMANCE.md](../DEV_PERFORMANCE.md) · [ADR-037](./adr/ADR-037-sse-outbox-consolidation.md) · [ADR-038](./adr/ADR-038-worker-health-real-probe.md)

**Non-goals:** Phase 11 auth/JARVIS features · new worker job types · Instagram collect UI · calendar GET `:id` (Amendment K closed)

---

## Planner decisions (binding)

| # | Decision |
|---|----------|
| **Q1** | **APPROVED** — **One SSE per cockpit tab**: `VoiceProvider` + shell in `cockpit/layout.tsx`; TelemetryStrip consumes shared stream (root causes #3/#4). |
| **Q2** | **APPROVED** — **Backend singletons**: pg-boss pool started once; **one** process-level outbox poller; `events/stream` subscribes (root causes #5/#6). |
| **Q3** | **APPROVED** — **Real worker-health probe** — not env echo only (root cause #7 / N7). |
| **Q4** | **APPROVED** — **Instant feel**: parallel RSC, `loading.tsx`, optimistic UI, `<Link>` not full reloads (perf §3.3). |
| **Q5** | **APPROVED** — **`verify:phase-10.5`** chains `verify:phase-10`; Phase 0–10 gates unchanged. |

### Conditions (C125–C140)

| ID | Condition |
|----|-----------|
| **C125** | **`apps/web/app/cockpit/layout.tsx`** wraps all cockpit routes with **one** `VoiceProvider` + `VoiceHudShell` (layout-level). |
| **C126** | **Remove** per-page `VoiceHudShell` from every `apps/web/app/cockpit/*/page.tsx` (page content only; shell from layout). |
| **C127** | **`TelemetryStrip`** consumes the **shared** voice/event stream — **no second `EventSource`**; on error close source (no auto-reconnect storm). |
| **C128** | **Exit gate** — exactly **one** `EventSource` open per cockpit tab; SSE + voice state **survive panel navigation** (manual + e2e where applicable). |
| **C129** | **pg-boss singleton** — module-level pool in `enqueue-job.ts`; **no start/stop per enqueue click**. |
| **C130** | **Single outbox poller** — process-level; `events/stream` **subscribes** to poller emissions; **`isOutboxDrainAllowed()`** / C117 gating preserved. |
| **C131** | **worker-health real probe** — e.g. queue consume heartbeat / last job signal; honest `consuming: false` when probe fails (ADR-038). |
| **C132** | **`loading.tsx` + Suspense** on cockpit routes; **`loadCockpitSlices`** (and related RSC) uses **`Promise.all`** not sequential awaits. |
| **C133** | **Optimistic UI** on enqueue / save / schedule — visible feedback **&lt; 100ms** (exit gate). |
| **C134** | **CalendarScheduler** — `next/link` `<Link>` replaces `<a href>` full reloads (incl. ~L548). |
| **C135** | **N1** — `HudHeader` phase chip shows **real** active phase (not hardcoded stub). |
| **C136** | **N2** — version markers consistent in `settings/page.tsx` and `lib/bff.ts`. |
| **C137** | **N5** — `docs/api-contracts.md` matches **`CockpitBffError`** behavior in code. |
| **C138** | **N6** — **`research`** job type available in calendar scheduler UI. |
| **C139** | **N9/N10** — `dev-stack.mjs`: Whisper sidecar **or** auto `ZEREF_WHISPER_MOCK`; set **`ZEREF_PHASE8_PRODUCT`** + **`ZEREF_PHASE9_RESEARCH`** on web child so live stack is not empty. |
| **C140** | **`.env.example`** documents all fixture / phase / mock flags; **`verify:phase-10.5`** chains **`verify:phase-10`** + Phase 10.5 contract checks ([verify.md](./verify.md)). |

### Performance exit gates (user terminal — not CI-hard unless noted)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Warm panel nav | **&lt; 800ms** | `next build && next start`; navigate between cockpit panels |
| Button feedback | **&lt; 100ms** | enqueue / save / schedule optimistic state |
| C122 carry-forward | advisory | `perf-smoke.mjs` warm `/cockpit` (Phase 10) |

**User runs** `verify:phase-10.5`, perf smoke, and `dev:stack` UAT in **their terminal** — Lead/agents do not autonomously run full verify or Docker.

---

## Amendment R — Phase 10.5 file firewall

### P10.5-A — Cockpit shell / single SSE (Worker A)

**Allowed:** `apps/web/app/cockpit/layout.tsx`, `apps/web/app/cockpit/*/page.tsx` (remove shell only), `apps/web/components/voice/VoiceProvider.tsx`, `apps/web/components/hud/VoiceHudShell.tsx`, `apps/web/components/hud/TelemetryStrip.tsx`

**Forbidden:** `apps/web/app/api/**`, `lib/jobs/**`, `lib/ops/**`, `cockpit-bff.ts`, `bff.ts`, `HudHeader.tsx`, `**/loading.tsx`, `docs/**`, `scripts/**`

**Council:** **MANDATORY** `council-review-slice` before merge (`layout.tsx`, `VoiceProvider`, SSE client behavior).

### P10.5-B — Backend singletons & honesty (Worker B)

**Allowed:** `apps/web/lib/jobs/enqueue-job.ts`, `apps/web/app/api/v1/events/stream/route.ts`, `apps/web/lib/ops/worker-health.ts`, `apps/web/lib/cockpit/outbox-drain.ts` (+ new poller under `lib/cockpit/`), `scripts/dev-stack.mjs`, `.env.example`

**Forbidden:** `apps/web/app/cockpit/**`, `components/**`, `cockpit-bff.ts`, `bff.ts`, `docs/**`

**Council:** **MANDATORY** for `events/stream`, pg-boss/enqueue, worker-health ([failures-checklist.md](../failures-checklist.md)).

### P10.5-C — Perf + nano drift (Worker C)

**Allowed:** `apps/web/app/cockpit/**/loading.tsx`, `apps/web/lib/cockpit-bff.ts`, `apps/web/lib/bff.ts`, `HudHeader.tsx`, `settings/page.tsx`, `CalendarScheduler.tsx`, `calendar-scheduler-utils.ts`, `docs/api-contracts.md`

**Forbidden:** `cockpit/layout.tsx`, `voice/**`, `VoiceHudShell.tsx`, `TelemetryStrip.tsx`, `app/api/**`, `lib/jobs/**`, `lib/ops/**`, `scripts/**`

**Council:** **MANDATORY** for `cockpit-bff.ts` parallelization.

### P10.5-D — Verify gate (Wave 2, after A+B+C)

**Allowed:** `scripts/verify-phase-10.5.mjs`, `apps/web/e2e/cockpit-stability-10.5.spec.ts` (if added), `package.json` (script), `.github/workflows/ci.yml`, `docs/governance/verify.md`

---

## Spawn waves (binding)

| Wave | Slices | Gate |
|------|--------|------|
| **0** | Lead governance (this contract + ADR-037/038 + cards) | — |
| **1** | **P10.5-A** ∥ **P10.5-B** ∥ **P10.5-C** | unit tests + council review each |
| **2** | **P10.5-D** verify + CI | `verify:phase-10.5` green |
| **3** | Lead merge + `CURRENT_STATE` | user perf UAT |

---

## Exit gate (all required)

1. `npm test -w @zeref/web` green  
2. `npm run verify:phase-10` green (no regression C111–C124)  
3. `npm run verify:phase-10.5` green  
4. User warm-nav UAT &lt; 800ms; button feedback &lt; 100ms  
5. One EventSource per tab; SSE survives nav  
6. pg-boss singleton; one outbox poller; real worker-health probe  
7. Lead updates `CURRENT_STATE.md` — Phase 10.5 **APPROVED**

---

## Root cause map (master plan §2)

| # | Symptom | Owner slice |
|---|---------|-------------|
| 3/4 | SSE reconnect storm; voice state lost on nav | P10.5-A |
| 5 | Per-connection outbox poll | P10.5-B |
| 6 | pg-boss start/stop per click | P10.5-B |
| 7 / N7 | worker-health env echo | P10.5-B |
| perf §3.3 | Slow sequential RSC, full reloads | P10.5-C |
| N1–N6, N9–N10 | Nano drift | P10.5-C / P10.5-B |
