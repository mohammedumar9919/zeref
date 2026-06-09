# Zeref — Verification commands

CI must fail if these commands fail.

**Related:** [ADR index](./adr/README.md) · [Phase 1](./phase-1-contract.md) · [Phase 2](./phase-2-contract.md) · [Phase 3](./phase-3-contract.md) · [Phase 4](./phase-4-contract.md) · [Phase 5](./phase-5-contract.md)

## Environment: `DATABASE_URL`

Phase 1–3 gates run `@zeref/db` and `@zeref/worker` tests against **Postgres 16**. Phase 3+ requires **pgvector** (`docker-compose.yml` uses `pgvector/pgvector:pg16`; CI uses the same image).

| Context | `DATABASE_URL` |
|---------|----------------|
| **Local (docker-compose default)** | `postgres://zeref:zeref@localhost:5432/zeref` |
| **Custom port** | Set `POSTGRES_PORT` in `.env`, then match host port in URL |
| **CI (GitHub Actions)** | `postgres://zeref:zeref@localhost:5432/zeref` |
| **Skip DB (debug only)** | `SKIP_DB_TESTS=1` — not used in CI |

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
```

## Full Phase 0–5 gate (orchestrator)

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
$env:ZEREF_LLM_MOCK='1'
$env:ZEREF_BFF_FIXTURE='1'
npm install
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
npm run verify:phase-3
npm run verify:phase-4
npm run verify:phase-5
```

**Do not set for default gate or CI:**

- `ZEREF_LIVE_INSTAGRAM` — live Instagram fetch (Phase 2; see [ADR-006](./adr/ADR-006-parse-fetch-live.md))
- `OPENAI_API_KEY`, `ZEREF_NOMIC_EMBED_URL`, or non-mock `ZEREF_EMBED_PROVIDER` — live embed (Phase 3; see [ADR-010](./adr/ADR-010-verify-phase-3-harness.md))
- `OPENROUTER_API_KEY` — live LLM (Phase 4; see [ADR-011](./adr/ADR-011-openrouter-mock.md))

**Phase 5 Playwright:** set `ZEREF_BFF_FIXTURE=1` for layout smoke without Postgres (see [ADR-018](./adr/ADR-018-verify-phase-5-harness.md)).

---

## Phase 0 (foundation scaffold)

```powershell
npm install
npm run build
npm run lint
npm run verify:phase-0
```

- **`verify:phase-0`** — scaffold paths + `@zeref/contracts` smoke (`scripts/verify-phase-0.mjs`)

---

## Phase 1 (contracts + snapshot DB skeleton)

**Contract:** [phase-1-contract.md](./phase-1-contract.md) · **ADRs:** [001](./adr/ADR-001-snapshot-data-model.md), [002](./adr/ADR-002-id-branding.md), [003](./adr/ADR-003-openapi-from-zod.md)

Requires `DATABASE_URL`.

```powershell
npm run verify:phase-0
npm run verify:phase-1
```

- **`verify:phase-1`** — contract, ADRs, `fixtures/phase-1/`, migrations, no pgvector (C5), `@zeref/db` tests

---

## Phase 2 (Instagram collectors → snapshots)

**Contract:** [phase-2-contract.md](./phase-2-contract.md) · **ADRs:** [004](./adr/ADR-004-instagram-merge.md)–[006](./adr/ADR-006-parse-fetch-live.md)

Requires `DATABASE_URL` for worker collect integration tests.

```powershell
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
```

### Q3: `ZEREF_LIVE_INSTAGRAM` (local only)

| Value | Behavior |
|-------|----------|
| **unset** (default, CI) | Parse + merge + Graph fixtures only |
| **`1`** | Live Playwright fetch smoke — run separately, not in CI |

`verify-phase-2.mjs` removes `ZEREF_LIVE_INSTAGRAM` from child env.

### CI (C10)

After `verify:phase-1` — no `ZEREF_LIVE_INSTAGRAM`.

---

## Phase 3 (normalize + embed + pgvector)

**Contract:** [phase-3-contract.md](./phase-3-contract.md) (C11–C16) · **ADRs:** [007](./adr/ADR-007-embedding-provider.md)–[010](./adr/ADR-010-verify-phase-3-harness.md)

Requires `DATABASE_URL` on Postgres 16 **with pgvector**.

```powershell
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
npm run verify:phase-3
```

### Q1: embed provider (no live embed in CI)

| Env | Default verify / CI | Local dev (optional) |
|-----|---------------------|----------------------|
| `ZEREF_EMBED_PROVIDER` | forced to **`mock`** | `openai` or `nomic` |
| `OPENAI_API_KEY` | **removed** | set for OpenAI embed |
| `ZEREF_NOMIC_EMBED_URL` | **removed** | set for nomic sidecar |

`verify-phase-3.mjs` strips live embed env and forces mock (ADR-010 / Q1). Deterministic mock vectors satisfy retrieval@3 goldens (C15).

Optional local live embed (not part of verify):

```powershell
$env:ZEREF_EMBED_PROVIDER='openai'
$env:OPENAI_API_KEY='...'
npm -w @zeref/worker test
```

### What `verify:phase-3` checks

Script: `scripts/verify-phase-3.mjs`

- `phase-3-contract.md`, ADR-007/008/009/010
- `fixtures/phase-3/` job I/O, `metrics/`, `retrieval/`
- `scripts/enqueue-normalize.mjs`, `scripts/enqueue-embed.mjs`, `@zeref/analytics`
- **C11:** `PHASE3_CONTRACT_VERSION`, normalize/embed job I/O schemas
- **C12 / C22:** worker registry includes `collect` + `normalize` + `embed` (may include analyze/report after Phase 4)
- **C14:** static guard — no `@zeref/instagram` in normalize/embed modules ([ADR-009](./adr/ADR-009-worker-normalize-boundaries.md))
- **C16:** migration enables pgvector + `vector(1536)` ([ADR-007](./adr/ADR-007-embedding-provider.md))
- `@zeref/contracts`, `@zeref/analytics` (retrieval@3 ≥ 1.0), `@zeref/db`, `@zeref/worker` tests

### CI (C13)

After `verify:phase-2`:

- Postgres service: `pgvector/pgvector:pg16`
- `DATABASE_URL=postgres://zeref:zeref@localhost:5432/zeref`
- `npm run verify:phase-3`
- No `ZEREF_LIVE_INSTAGRAM`, no live embed env

---

## Phase 4 (analyze + report)

**Contract:** [phase-4-contract.md](./phase-4-contract.md) (C17–C23) · **ADRs:** [011](./adr/ADR-011-openrouter-mock.md)–[014](./adr/ADR-014-verify-phase-4.md)

Requires `DATABASE_URL` on Postgres 16 with pgvector.

```powershell
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
npm run verify:phase-3
npm run verify:phase-4
```

### Q1: LLM (no live OpenRouter in CI)

| Env | Default verify / CI |
|-----|---------------------|
| `ZEREF_LLM_MOCK` | **`1`** |
| `OPENROUTER_API_KEY` | **removed** in verify children |
| `OPENROUTER_MODEL` | optional; default `openai/gpt-4o-mini` |

### What `verify:phase-4` checks

Script: `scripts/verify-phase-4.mjs`

- `phase-4-contract.md`, ADR-011–014
- `fixtures/phase-4/` job I/O + `elite/` goldens
- `scripts/enqueue-analyze.mjs`, `scripts/enqueue-report.mjs`, `@zeref/reports`
- **C17:** `PHASE4_CONTRACT_VERSION`, analyze/report job I/O, `EliteReportSchema`
- **C18:** worker registry exactly five jobs
- **C19:** no `@zeref/instagram` in analyze/report/reports guard paths
- **C20:** elite golden + citation tests
- **C23:** integration test asserts `elite` artifact row

### CI (C21)

After `verify:phase-3`:

- `ZEREF_LLM_MOCK=1`
- `npm run verify:phase-4`

---

## Phase 5 (Cockpit UI shell + Playwright)

**Contract:** [phase-5-contract.md](./phase-5-contract.md) (C24–C30) · **ADRs:** [015](./adr/ADR-015-globe-performance.md)–[018](./adr/ADR-018-verify-phase-5-harness.md)

Playwright layout smoke uses **fixture BFF** by default (no `DATABASE_URL` required).

```powershell
$env:ZEREF_BFF_FIXTURE='1'
npm run verify:phase-5
```

Optional DB-backed BFF dev:

```powershell
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
node scripts/seed-cockpit-playwright.mjs
npm -w @zeref/web test
```

### Q2: `ZEREF_BFF_FIXTURE` (no Postgres for layout smoke)

| Value | Behavior |
|-------|----------|
| **`1`** (default verify / CI) | BFF serves `fixtures/phase-5/cockpit-slices.fixture.json`; Playwright runs without DB |
| unset + no `DATABASE_URL` | Empty panel summaries from BFF (see ADR-016) |

**No live embed, LLM, or Instagram** in Phase 5 verify — prior phase env stripping still applies.

### What `verify:phase-5` checks

Script: `scripts/verify-phase-5.mjs`

- `phase-5-contract.md`, ADR-015–018, `docs/design/DESIGN_SYSTEM.md`
- `fixtures/phase-5/` including `cockpit-slices.fixture.json`
- **C24:** `PHASE5_CONTRACT_VERSION`, `CockpitSlicesSchema`
- **C27:** cockpit RSC pages call `getCockpitSlices()` from `@/lib/bff`
- **C30:** no voice/whisper/jarvis/`@zeref/instagram` imports in `apps/web`
- `npm run build` (includes Next production build)
- `@zeref/contracts` + `@zeref/web` unit tests
- **C28:** Playwright `cockpit-layout` — nav, 4 panels, globe canvas (Chromium)

### CI (C28)

After `verify:phase-4`:

- Install Playwright Chromium
- `ZEREF_BFF_FIXTURE=1`, `ZEREF_LLM_MOCK=1`
- `npm run verify:phase-5` (includes Playwright)

---

## Phase 6.1 (Luke Tier-2 HUD visual polish)

**Contract:** [phase-6.1-contract.md](./phase-6.1-contract.md) (C91–C98, Amendment N) · **ADR:** [033](./adr/ADR-033-luke-tier2-visual-acceptance.md)

Chains Phase 0–5.1 only — **independent** of `verify:phase-6` through `verify:phase-9`.

```powershell
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_LLM_MOCK='1'
$env:ZEREF_PHASE51_UI='1'
$env:ZEREF_PHASE61_UI='1'
npm run verify:phase-6.1
```

### Env flags

| Env | Default verify / CI |
|-----|---------------------|
| `ZEREF_PHASE61_UI` | **`1`** — enforce `cockpit-hud-6.1.spec.ts` (C91–C94) + C48 regression via `cockpit-hud-5.1.spec.ts` |
| `ZEREF_PHASE51_UI` | **`1`** — required so C48 HUD tests are not skipped |
| `ZEREF_BFF_FIXTURE` | **`1`** — fixture BFF; no Postgres for Playwright path |

Does **not** require `ZEREF_PHASE6_VOICE`, `ZEREF_PHASE7_BRAIN`, or Phase 8–9 flags (C98).

### What `verify:phase-6.1` checks

Script: `scripts/verify-phase-6.1.mjs`

- `phase-6.1-contract.md`, ADR-033
- Reference screenshot `docs/design/reference/screenshots/zeref-cockpit-6.1-hud.png` (Planner sign-off artifact)
- Chains `verify:phase-5.1` (phases 0–5.1)
- **C96:** Playwright `cockpit-hud-5.1` (C48) + `cockpit-hud-6.1` (C91–C94) when `ZEREF_PHASE61_UI=1`

### CI (C98)

After `verify:phase-5.1`:

- `ZEREF_PHASE51_UI=1`, `ZEREF_PHASE61_UI=1`, `ZEREF_BFF_FIXTURE=1`, `ZEREF_LLM_MOCK=1`
- `npm run verify:phase-6.1`

---

## Phase 7 (zeref-memory + event→orb)

**Contract:** [phase-7-contract.md](./phase-7-contract.md) (C61–C70, Amendments A–D) · **ADRs:** [025](./adr/ADR-025-memory-postgres-schema.md)–[027](./adr/ADR-027-sse-brain-events-outbox.md)

Chains Phase 0–6, then Phase 7 unit checks and **hard-enforced** Playwright brain spec (Wave 4).

```powershell
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_WHISPER_MOCK='1'
$env:ZEREF_TTS_MOCK='1'
$env:ZEREF_LLM_MOCK='1'
$env:ZEREF_MEMORY_MOCK='1'
$env:ZEREF_PHASE6_VOICE='1'
$env:ZEREF_PHASE7_BRAIN='1'
npm run verify:phase-7
```

### Env flags

| Env | Default verify / CI |
|-----|---------------------|
| `ZEREF_MEMORY_MOCK` | **`1`** (C64) |
| `ZEREF_PHASE7_BRAIN` | **`1`** — enforce `cockpit-brain-7.spec.ts` |
| `ZEREF_PHASE6_VOICE` | **`1`** in CI |

**No browser memory write** — `@zeref/zeref-memory` only in server paths (`app/api/**`, `lib/memory/**`, `lib/cockpit/**`).

### What `verify:phase-7` checks

Script: `scripts/verify-phase-7.mjs`

- `phase-7-contract.md`, ADR-025–027
- `fixtures/phase-7/` memory + outbox goldens
- **C62:** `PHASE7_CONTRACT_VERSION` = `7.0.0`, brain event + outbox schemas
- **C70:** extends C30/C59 import guard — server-only `@zeref/zeref-memory`
- `@zeref/zeref-memory`, `@zeref/contracts`, `@zeref/jarvis-kernel`, `@zeref/web` tests (`memory-routes.test.mjs`)
- **C67:** Playwright `cockpit-brain-7` — `data-globe-brain-state`, `memory.saved` SSE (hard-fail unless `ZEREF_PHASE7_BRAIN=1`)

### CI (C70)

After `verify:phase-6` (Phase 6 mock flags: `ZEREF_WHISPER_MOCK`, `ZEREF_TTS_MOCK`, `ZEREF_BFF_FIXTURE`, `ZEREF_PHASE6_VOICE`, `ZEREF_PHASE51_UI`, `ZEREF_PLAYWRIGHT_REUSE`):

- `ZEREF_MEMORY_MOCK=1` (required)
- `ZEREF_PHASE7_BRAIN=1` (required) — `cockpit-brain-7` enforced
- `npm run verify:phase-7`

---

## Phase 8 (studio editor + calendar scheduler)

**Contract:** [phase-8-contract.md](./phase-8-contract.md) (C71–C80, Amendments F–J) · **ADRs:** [028](./adr/ADR-028-studio-drafts-editor.md)–[030](./adr/ADR-030-bff-job-enqueue.md)

Chains Phase 0–7, then Phase 8 contract/fixture/BFF checks. **Wave 2:** Playwright studio/calendar specs **skip until Wave 4** (P8-C/P8-D UI).

```powershell
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_WHISPER_MOCK='1'
$env:ZEREF_TTS_MOCK='1'
$env:ZEREF_LLM_MOCK='1'
$env:ZEREF_MEMORY_MOCK='1'
$env:ZEREF_JOB_ENQUEUE_MOCK='1'
$env:ZEREF_PHASE6_VOICE='1'
$env:ZEREF_PHASE7_BRAIN='1'
$env:ZEREF_PHASE8_PRODUCT='1'
npm run verify:phase-8
```

### Env flags

| Env | Default verify / CI | Wave 4 enforcement |
|-----|---------------------|-------------------|
| `ZEREF_JOB_ENQUEUE_MOCK` | **`1`** (C80) | required |
| `ZEREF_PHASE8_PRODUCT` | **`1`** in CI | hard-fail studio/calendar e2e after P8-C + P8-D |
| `ZEREF_BFF_FIXTURE` | **`1`** | fixture BFF; no Postgres for Playwright path |
| Phase 7 flags | same as `verify:phase-7` | inherited in chain |

**Wave 4 (after P8-C + P8-D):** set `wave4StudioUiReady` / `wave4CalendarUiReady` to `true` in e2e specs (or remove Wave 4 skip) so `ZEREF_PHASE8_PRODUCT=1` enforces `studio-editor` and `calendar-scheduler`.

### What `verify:phase-8` checks

Script: `scripts/verify-phase-8.mjs`

- `phase-8-contract.md`, ADR-028–030
- `fixtures/phase-8/` including `cockpit-slices.valid.json` (`phase8-cockpit-v1`)
- **C71:** `PHASE8_CONTRACT_VERSION` = `8.0.0`, calendar/studio/enqueue + `CockpitSlicesSchemaV8`
- **C73–C74:** BFF routes + `phase-8-routes.test.mjs`
- **C78:** extends C70 import guard (no snapshot mutation paths via instagram)
- **C75/C76:** Playwright scaffolds `cockpit-studio-8`, `cockpit-calendar-8` (skipped until Wave 4)
- `@zeref/contracts`, `@zeref/web` tests

### CI (C80)

After `verify:phase-7`:

- `ZEREF_PHASE8_PRODUCT=1`, `ZEREF_JOB_ENQUEUE_MOCK=1`, `ZEREF_BFF_FIXTURE=1` (+ Phase 6–7 mock flags)
- `npm run verify:phase-8`

---

## Phase 9 (research trend pipelines)

**Contract:** [phase-9-contract.md](./phase-9-contract.md) (C81–C90, Amendments L–M) · **ADRs:** [031](./adr/ADR-031-research-postgres-schema.md)–[032](./adr/ADR-032-research-worker-bff.md)

Chains Phase 0–8, then Phase 9 contract/fixture/BFF/worker checks. **Wave 4:** Playwright research spec **hard-enforced** when `ZEREF_PHASE9_RESEARCH=1` (P9-C + P9-E).

```powershell
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_WHISPER_MOCK='1'
$env:ZEREF_TTS_MOCK='1'
$env:ZEREF_LLM_MOCK='1'
$env:ZEREF_MEMORY_MOCK='1'
$env:ZEREF_JOB_ENQUEUE_MOCK='1'
$env:ZEREF_PHASE6_VOICE='1'
$env:ZEREF_PHASE7_BRAIN='1'
$env:ZEREF_PHASE8_PRODUCT='1'
$env:ZEREF_PHASE9_RESEARCH='1'
npm run verify:phase-9
```

### Env flags

| Env | Default verify / CI | Wave 4 enforcement |
|-----|---------------------|-------------------|
| `ZEREF_PHASE9_RESEARCH` | **`1`** (C90) | **enforced** — `cockpit-research-9.spec.ts` hard-fails on non-zero |
| `ZEREF_JOB_ENQUEUE_MOCK` | **`1`** | required (Amendment L) |
| `ZEREF_BFF_FIXTURE` | **`1`** | fixture BFF; no Postgres for Playwright path |
| Phase 8 flags | same as `verify:phase-8` | inherited in chain |

**Wave 4 (P9-E):** `wave4ResearchUiReady = true` in `cockpit-research-9.spec.ts`; `verify:phase-9` hard-fails when Playwright exits non-zero. Testids: `research-hub` on `/cockpit/research`, `panel-research` on `/cockpit`.

### What `verify:phase-9` checks

Script: `scripts/verify-phase-9.mjs`

- `phase-9-contract.md`, ADR-031–032
- `fixtures/phase-9/` including `cockpit-slices.valid.json` (`phase9-cockpit-v1`)
- **C81:** `PHASE9_CONTRACT_VERSION` = `9.0.0`, research + `CockpitSlicesSchemaV9`
- **C83:** `@zeref/worker` research handler unit test
- **C84–C85:** BFF routes + `phase-9-routes.test.mjs`
- **C87:** Playwright `cockpit-research-9` — `research-hub` + `panel-research` (hard-enforced)
- `@zeref/contracts`, `@zeref/worker`, `@zeref/web` tests

### CI (C90)

After `verify:phase-8`:

- `ZEREF_PHASE9_RESEARCH=1`, `ZEREF_JOB_ENQUEUE_MOCK=1`, `ZEREF_BFF_FIXTURE=1` (+ Phase 6–8 mock flags)
- `npm run verify:phase-9`
