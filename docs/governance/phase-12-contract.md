# Zeref — Phase 12 Contract (Real Data & Live Instagram)

**Phase:** 12  
**Status:** **PLANNING** (Lead orchestrator 2026-06-16)  
**Theme:** Default operator path to **live Graph + scheduled collect**; honest **data-age** on every cockpit panel; **restore media** in normalized payload for Studio previews and JARVIS read tools.

**Prerequisites:** Phase 11 **APPROVED** @ `0072c18`; `verify:phase-11` green on `main`. Phases 0–11 must **remain green**.

**References:** Master plan `zeref_master_plan_ab56bf3f.plan.md` (§6 Phase 12) · [phase-11-contract.md](./phase-11-contract.md) C153 · [phase-10.5-contract.md](./phase-10.5-contract.md) C128 · [ADR-004](./adr/ADR-004-instagram-merge.md) · [ADR-005](./adr/ADR-005-worker-collect.md) · [ADR-006](./adr/ADR-006-parse-fetch-live.md) · [ADR-042](./adr/ADR-042-scheduled-collect-data-age.md) · [failures-checklist.md](../failures-checklist.md)

**Non-goals:** Competitor intel (Phase 13) · pro reports/charts (Phase 14) · streaming TTS (Phase 15) · Meta publish/App Review (Phase 16) · multi-tenant auth · vector memory (Phase 11.x) · cockpit visual Tier 3 (Phase 6.2 — parallel UI-only track only)

---

## Planner decisions (binding)

| # | Decision |
|---|----------|
| **Q1** | **Media restore** — `NormalizedPostPayload` gains optional `thumbnailUrl`, `videoUrl`, `carouselUrls`; normalize preserves ADR-004 scrape-wins media from merged snapshots. |
| **Q2** | **Scheduled collect** — pg-boss recurring `schedule-collect` job (default 6h) enqueues `collect` when `INSTAGRAM_ACCESS_TOKEN` is present; CI never requires live token. |
| **Q3** | **Data-age honesty** — every cockpit slice item and JARVIS read tool result exposes `collectedAt` and/or `dataAgeMs`; UI badges: `fixture` \| `stale` \| `live`. |
| **Q4** | **`dev:stack` operator path** — Graph collect when token set; `ZEREF_PHASE11_AGENT=1` on web child (C177). |
| **Q5** | **Verify chains P11** — `verify:phase-12` chains `verify:phase-11`; fixture-safe (deletes `ZEREF_LIVE_INSTAGRAM`). |
| **Q6** | **No SSE regression** — C128 single EventSource per tab unchanged; `verify:phase-10.5` stays green. |

---

## Conditions (C163–C178)

### Contracts + normalize (P12-A)

| ID | Condition |
|----|-----------|
| **C163** | **`NormalizedPostPayload`** schema includes optional `thumbnailUrl`, `videoUrl`, `carouselUrls` — contracts bump. |
| **C164** | **`buildNormalizedPostPayload`** preserves media from merged snapshot per ADR-004 scrape-wins rules. |

### Scheduled collect + operator env (P12-B)

| ID | Condition |
|----|-----------|
| **C165** | **Scheduled collect** — pg-boss recurring `schedule-collect` job (configurable interval, default 6h) enqueues `collect` when `INSTAGRAM_ACCESS_TOKEN` present. |
| **C166** | **`dev:stack` live path** — when token in env, worker uses Graph collect; documented in `.env.example`. |

### Data-age BFF + UI + JARVIS (P12-C)

| ID | Condition |
|----|-----------|
| **C167** | **Data-age field** on cockpit slice items — `dataAgeMs` and/or `collectedAt` ISO from latest snapshot/entity timestamp. |
| **C168** | **Data-age badges** on Studio, Calendar, Reports, Research panels — honest `fixture` / `stale` / `live` states. |
| **C169** | **JARVIS read tools** return data-age metadata in tool results (extends P11 C153 live adapters). |
| **C177** | **`dev:stack`** sets `ZEREF_PHASE11_AGENT=1` on web child env. |

### Verify + CI (P12-D)

| ID | Condition |
|----|-----------|
| **C170** | **CI fixture-safe** — `verify:phase-12` deletes `ZEREF_LIVE_INSTAGRAM`; no live Graph in CI. |
| **C171** | **`ZEREF_PHASE12_DATA=1`** gates P12 Playwright + slice loaders. |
| **C172** | **ADR-042** — scheduled collect + data-age honesty (accepted with this contract). |
| **C173** | **`verify:phase-12`** chains **`verify:phase-11`**. |
| **C174** | **Unit tests** — normalize media round-trip; data-age computation; schedule job registration. |
| **C175** | **E2E** — `cockpit-data-age-12.spec.ts`: data-age badge visible (fixture mode shows `fixture`). |
| **C176** | **No regression** — `verify:phase-10.5` stability (C128 single SSE). |
| **C178** | Port **3099** EADDRINUSE cleanup documented in [verify.md](./verify.md). |

---

## Amendment T — Phase 12 file firewall

### P12-A — Contracts + normalize media (Worker A)

**Allowed:** `packages/contracts/src/**/normalized*.ts`, `packages/analytics/**`, `apps/worker/src/lib/normalize-payload.ts`, `fixtures/phase-12/**`

**Forbidden:** `apps/web/**`, `apps/worker/src/jobs/collect.ts`, `boss.ts`, `scripts/**`, `cockpit-bff`

**Deliver:** C163, C164, C174 (normalize tests)

**Council:** **MANDATORY** — contracts + normalize boundary

### P12-B — Scheduled collect + Graph operator path (Worker B)

**Allowed:** `apps/worker/src/jobs/**`, `apps/worker/src/lib/collect-pipeline.ts`, `apps/worker/src/boss.ts`, new `apps/worker/src/jobs/schedule-collect.ts`, `.env.example`

**Forbidden:** `apps/web/**`, `packages/contracts/**` (merge P12-A first OR read-only consume after A lands), `packages/db/**` unless migration required

**Deliver:** C165, C166, C174 (schedule registration tests)

**Council:** **MANDATORY** — worker + collect pipeline

### P12-C — BFF data-age + UI badges + JARVIS adapter (Worker C)

**Allowed:** `apps/web/lib/cockpit-bff.ts`, `apps/web/lib/jarvis/**` (read adapters only), `apps/web/components/cockpit/**`, `apps/web/components/hud/**` (badge chips), `scripts/dev-stack.mjs`

**Forbidden:** `apps/worker/**`, `packages/contracts/**`, `handle-turn.ts`, `apps/web/app/api/**`

**Deliver:** C167–C169, C177, C175

**Council:** **MANDATORY** — BFF + jarvis read adapters + [failures-checklist.md](../failures-checklist.md)

### P12-D — Verify + CI (Wave 2)

**Allowed:** `scripts/verify-phase-12.mjs`, `apps/web/e2e/cockpit-data-age-12.spec.ts`, `.github/workflows/ci.yml`, `docs/governance/verify.md`, `package.json`

**Deliver:** C170–C173, C175, C178

**Council:** Stage 2 on CI/verify script changes

---

## Spawn waves (binding)

| Wave | Slices | Gate |
|------|--------|------|
| **0** | Lead governance (this contract + ADR-042 + housekeeping) | docs merged; user runs `verify:phase-11` |
| **1** | **P12-A** ∥ **P12-B** ∥ **P12-C** | unit tests + council each |
| **2** | **P12-D** | `verify:phase-12` green |
| **3** | Lead merge + `CURRENT_STATE` | Phase 12 **APPROVED** |

**Parallel track (optional, separate spawn):** Phase 6.2 Wave 1 per [phase-6.2-contract.md](./phase-6.2-contract.md) — UI-only; does not block P12.

---

## Exit gate (all required)

1. `npm test -w @zeref/web` green  
2. `npm run verify:phase-11` green (no regression)  
3. `npm run verify:phase-12` green  
4. Media round-trip in normalized payload (C163–C164)  
5. Data-age badges honest in fixture + live modes (C167–C168)  
6. Scheduled collect registered (unit); no live Graph required in CI (C165, C170)  
7. C128 single SSE unchanged (`verify:phase-10.5` green)  
8. Lead updates `CURRENT_STATE.md` — Phase 12 **APPROVED**

---

## Grounding (current codebase)

| Area | Today | Phase 12 target |
|------|-------|-----------------|
| `normalize-payload.ts` | Drops `thumbnailUrl`/`videoUrl`/`carouselUrls` | Preserve media C164 |
| `NormalizedPostPayload` | No media fields | Optional media C163 |
| Collect | Manual enqueue only | Recurring `schedule-collect` C165 |
| Cockpit panels | Fixture or stale DB; no age badge | `fixture`/`stale`/`live` badges C168 |
| JARVIS read tools | Live reads without data-age | `collectedAt`/`dataAgeMs` in results C169 |
| `dev:stack` | No `ZEREF_PHASE11_AGENT` | Agent default ON C177 |

**First verify command (after Wave 0, user terminal):**

```powershell
cd C:\Projects\zeref
npm run verify:phase-11
```

**After Wave 1 P12-A:**

```powershell
npm run build -w @zeref/contracts
npm test -w @zeref/worker
```

**Full phase gate (after Wave 2, user terminal — kill port 3099 if EADDRINUSE):**

```powershell
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_PHASE11_AGENT='1'
$env:ZEREF_PHASE12_DATA='1'
npm run verify:phase-12
```
