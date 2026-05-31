# ADR-018: verify:phase-5 harness (Playwright cockpit-layout, C28)

**Status:** Accepted  
**Date:** 2026-05-29  
**Owner:** QA agent  
**Phase:** 5  
**Related:** [Phase 5 contract](../phase-5-contract.md) (C24–C30) · [ADR index](./README.md) · [ADR-015](./ADR-015-globe-performance.md) · [ADR-016](./ADR-016-bff-cockpit-slices.md) · [ADR-017](./ADR-017-cockpit-routes-layout.md) · [verify.md](../verify.md)

## Context

Phase 5 ships the Cockpit UI shell: top nav, four panels, center globe (client island), and BFF-backed RSC panel summaries. Planner **C28** requires **Playwright cockpit-layout tests in CI** — the first phase where browser tests are mandatory (contrast ADR-006 Phase 2 fixture-only path).

## Decision

### Entry point

`npm run verify:phase-5` → `scripts/verify-phase-5.mjs`

Runs after `verify:phase-4` in the **Phase 0–5 gate** (C28).

### Child process environment

| Variable | CI / default verify |
|----------|---------------------|
| `ZEREF_BFF_FIXTURE` | **`1`** — BFF reads `fixtures/phase-5/cockpit-slices.fixture.json`; no Postgres required for Playwright |
| `ZEREF_LLM_MOCK` | **`1`** |
| `ZEREF_EMBED_PROVIDER` | **`mock`** |
| `OPENROUTER_API_KEY` / `OPENAI_API_KEY` | **removed** |
| `ZEREF_LIVE_INSTAGRAM` | **removed** |
| `CI` | **`true`** |
| `PLAYWRIGHT_PORT` / `PORT` | **`3099`** (Playwright `webServer` + `next start`) |

### Static checks (script-owned)

| Check | Requirement |
|-------|-------------|
| Governance | `phase-5-contract.md`, ADR-015–018, `DESIGN_SYSTEM.md` |
| Fixtures | `fixtures/phase-5/cockpit-slices.*.json` including `.fixture.json` for BFF/CI |
| **C24** | Built `@zeref/contracts`: `PHASE5_CONTRACT_VERSION`, `CockpitSlicesSchema` |
| **C25–C26** | Playwright spec + globe component + BFF route files exist |
| **C27** | Cockpit RSC pages import and call `getCockpitSlices()` from `@/lib/bff` |
| **C30** | No `@zeref/instagram` / voice / whisper / jarvis **import statements** under `apps/web` |

Dynamic contract imports use `pathToFileURL` (Windows ESM).

### Playwright (C28) — required in CI

1. `npm run build` (includes `@zeref/web` Next production build).
2. `npm -w @zeref/web run test:e2e:install` — Chromium only.
3. `npm -w @zeref/web run test:e2e` — `apps/web/e2e/cockpit-layout.spec.ts`:
   - Top nav: Cockpit + Settings only (C25)
   - Four panel regions + globe island + globe canvas (C26)
   - Root redirect, settings link, studio deep-link focus

`playwright.config.ts` starts `npm run start` against the production build on port 3099.

### Delegated workspace tests

| Package | Covers |
|---------|--------|
| `@zeref/contracts` | Phase 5 cockpit DTO round-trips |
| `@zeref/web` | BFF unit tests (fixture + optional DB) |

### CI workflow

- Job renamed **Phase 0–5 gate**
- Step: Install Playwright Chromium (before `verify:phase-5`)
- `verify:phase-5` with `ZEREF_BFF_FIXTURE=1` (no `DATABASE_URL` required for Playwright path)

## Consequences

- Phase 5 CI is slower than Phase 0–4 due to Next build + browser smoke; acceptable per C28.
- Local full gate can omit Postgres for Phase 5 when using fixture BFF; optional `scripts/seed-cockpit-playwright.mjs` for DB-backed BFF dev.
- Phase 6 voice work must not add forbidden imports to `apps/web` until contract allows.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Skip Playwright in CI | Violates C28 |
| Require Postgres for every Playwright run | Slower/flaky; fixture BFF sufficient for layout smoke (ADR-016) |
| Dev server instead of `next start` | Non-deterministic; production start matches deploy |

## Verification

```powershell
cd c:\Projects\zeref
$env:ZEREF_BFF_FIXTURE='1'
npm run verify:phase-5
```

---

## Phase 5.1 extension (`verify:phase-5.1`, C49)

**Status:** Accepted (2026-05-30)  
**Contract:** [phase-5.1-contract.md](../phase-5.1-contract.md) (C43–C50) · [ADR-015 amendment](./ADR-015-amendment-phase-5.1.md) · [ADR-019](./ADR-019-telemetry-sse-stub.md)

### Entry point

`npm run verify:phase-5.1` → `scripts/verify-phase-5.1.mjs`

Orchestrates **`verify:phase-0` … `verify:phase-5`** (C48 Playwright runs inside **`verify:phase-5`** `test:e2e` — no second `webServer` boot on port 3099), then Phase 5.1 static checks.

### C48 Playwright (deferred until UI lands)

Spec: `apps/web/e2e/cockpit-hud-5.1.spec.ts`

| Assertion | `data-testid` / attribute |
|-----------|---------------------------|
| HUD header | `hud-header` |
| HUD footer | `hud-footer` |
| Simulated telemetry badge | `telemetry-simulated` |
| Simulated AUDIO I/O badge | `audio-io-simulated` |
| Point-cloud globe mode | `globe-canvas` `data-globe-mode="point-cloud"` |

**Pre-UI scaffold:** tests **skip** unless `ZEREF_PHASE51_UI=1`. `verify:phase-5.1` exits 0 with a deferral note when the flag is unset (expected until UI agent **P5.1-A** lands).

**Post-UI:** set `ZEREF_PHASE51_UI=1` locally and in CI to enforce hard failures.

Preserved from Phase 5: `cockpit-grid`, `panel-*`, `globe-island`, `globe-canvas` (see `cockpit-layout.spec.ts`).

### CI workflow

- Job renamed **Phase 0–5.1 gate**
- Step: `verify:phase-5.1` after `verify:phase-5` (same `ZEREF_BFF_FIXTURE=1` / `ZEREF_LLM_MOCK=1` env)
- Enable `ZEREF_PHASE51_UI=1` on the 5.1 step once HUD UI merges

### Static checks (5.1-owned)

| Check | Requirement |
|-------|-------------|
| Governance | `phase-5.1-contract.md`, ADR-015 amendment, ADR-019 |
| **C48** | E2E spec references all new testids |
| **C50** | Same voice/instagram import guard as C30 |

### Phase 5.1 verify command

```powershell
cd c:\Projects\zeref
$env:ZEREF_BFF_FIXTURE='1'
npm run verify:phase-5.1
# After UI lands: $env:ZEREF_PHASE51_UI='1'; npm run verify:phase-5.1
```

---

## Phase 6 extension (`verify:phase-6`, C59)

**Status:** Accepted (2026-05-30)  
**Contract:** [phase-6-contract.md](../phase-6-contract.md) (C51–C60) · ADR-020–024

### Entry point

`npm run verify:phase-6` → `scripts/verify-phase-6.mjs`

Orchestrates **`verify:phase-5.1`** (phases 0–5 inside), Phase 6 static checks, package tests, and Playwright **C59** voice assertions.

### CI child environment (Phase 6 step)

| Variable | Value |
|----------|--------|
| `ZEREF_WHISPER_MOCK` | **`1`** |
| `ZEREF_TTS_MOCK` | **`1`** |
| `ZEREF_LLM_MOCK` | **`1`** |
| `ZEREF_BFF_FIXTURE` | **`1`** |
| `ZEREF_PHASE51_UI` | **`1`** |
| `ZEREF_PHASE6_VOICE` | **`1`** (enforce C59 Playwright after UI lands) |

### C59 Playwright

Spec: `apps/web/e2e/cockpit-voice-6.spec.ts`

| Assertion | Selector |
|-----------|----------|
| PTT control | `data-testid="ptt-button"` |
| Live AUDIO I/O | `data-testid="audio-io-live"` (simulated hidden) |
| Globe voice state | `globe-island` `data-globe-voice-state` |

**Pre-UI scaffold:** tests **skip** unless `ZEREF_PHASE6_VOICE=1`. `verify:phase-6` exits 0 with deferral note when unset.

### C59 import guard (extends C30)

| Path | `@zeref/jarvis-kernel` |
|------|------------------------|
| `apps/web/app/api/**` | **Allowed** (server route handlers) |
| `apps/web/lib/voice/**` | **Allowed** (BFF voice helpers) |
| `apps/web/components/**` | **Forbidden** (especially `"use client"`) |
| `@zeref/instagram` | **Forbidden** everywhere |

### CI workflow

- Job renamed **Phase 0–6 gate**
- Step: `verify:phase-6` after `verify:phase-5.1`

### Phase 6 verify command

```powershell
cd c:\Projects\zeref
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_WHISPER_MOCK='1'
$env:ZEREF_TTS_MOCK='1'
$env:ZEREF_LLM_MOCK='1'
npm run verify:phase-6
# After UI lands: $env:ZEREF_PHASE6_VOICE='1'; npm run verify:phase-6
```
