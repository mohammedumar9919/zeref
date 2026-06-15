# Zeref â€” Verification commands

CI must fail if these commands fail.

**Related:** [ADR index](./adr/README.md) Â· [Phase 1](./phase-1-contract.md) Â· [Phase 2](./phase-2-contract.md) Â· [Phase 3](./phase-3-contract.md) Â· [Phase 4](./phase-4-contract.md) Â· [Phase 5](./phase-5-contract.md)

## Environment: `DATABASE_URL`

Phase 1â€“3 gates run `@zeref/db` and `@zeref/worker` tests against **Postgres 16**. Phase 3+ requires **pgvector** (`docker-compose.yml` uses `pgvector/pgvector:pg16`; CI uses the same image).

| Context | `DATABASE_URL` |
|---------|----------------|
| **Local (docker-compose default)** | `postgres://zeref:zeref@localhost:5432/zeref` |
| **Custom port** | Set `POSTGRES_PORT` in `.env`, then match host port in URL |
| **CI (GitHub Actions)** | `postgres://zeref:zeref@localhost:5432/zeref` |
| **Skip DB (debug only)** | `SKIP_DB_TESTS=1` â€” not used in CI |

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
```

## Full Phase 0â€“5 gate (orchestrator)

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

- `ZEREF_LIVE_INSTAGRAM` â€” live Instagram fetch (Phase 2; see [ADR-006](./adr/ADR-006-parse-fetch-live.md))
- `OPENAI_API_KEY`, `ZEREF_NOMIC_EMBED_URL`, or non-mock `ZEREF_EMBED_PROVIDER` â€” live embed (Phase 3; see [ADR-010](./adr/ADR-010-verify-phase-3-harness.md))
- `OPENROUTER_API_KEY` â€” live LLM (Phase 4; see [ADR-011](./adr/ADR-011-openrouter-mock.md))

**Phase 5 Playwright:** set `ZEREF_BFF_FIXTURE=1` for layout smoke without Postgres (see [ADR-018](./adr/ADR-018-verify-phase-5-harness.md)).

---

## Phase 0 (foundation scaffold)

```powershell
npm install
npm run build
npm run lint
npm run verify:phase-0
```

- **`verify:phase-0`** â€” scaffold paths + `@zeref/contracts` smoke (`scripts/verify-phase-0.mjs`)

---

## Phase 1 (contracts + snapshot DB skeleton)

**Contract:** [phase-1-contract.md](./phase-1-contract.md) Â· **ADRs:** [001](./adr/ADR-001-snapshot-data-model.md), [002](./adr/ADR-002-id-branding.md), [003](./adr/ADR-003-openapi-from-zod.md)

Requires `DATABASE_URL`.

```powershell
npm run verify:phase-0
npm run verify:phase-1
```

- **`verify:phase-1`** â€” contract, ADRs, `fixtures/phase-1/`, migrations, no pgvector (C5), `@zeref/db` tests

---

## Phase 2 (Instagram collectors â†’ snapshots)

**Contract:** [phase-2-contract.md](./phase-2-contract.md) Â· **ADRs:** [004](./adr/ADR-004-instagram-merge.md)â€“[006](./adr/ADR-006-parse-fetch-live.md)

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
| **`1`** | Live Playwright fetch smoke â€” run separately, not in CI |

`verify-phase-2.mjs` removes `ZEREF_LIVE_INSTAGRAM` from child env.

### CI (C10)

After `verify:phase-1` â€” no `ZEREF_LIVE_INSTAGRAM`.

---

## Phase 3 (normalize + embed + pgvector)

**Contract:** [phase-3-contract.md](./phase-3-contract.md) (C11â€“C16) Â· **ADRs:** [007](./adr/ADR-007-embedding-provider.md)â€“[010](./adr/ADR-010-verify-phase-3-harness.md)

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
- **C14:** static guard â€” no `@zeref/instagram` in normalize/embed modules ([ADR-009](./adr/ADR-009-worker-normalize-boundaries.md))
- **C16:** migration enables pgvector + `vector(1536)` ([ADR-007](./adr/ADR-007-embedding-provider.md))
- `@zeref/contracts`, `@zeref/analytics` (retrieval@3 â‰¥ 1.0), `@zeref/db`, `@zeref/worker` tests

### CI (C13)

After `verify:phase-2`:

- Postgres service: `pgvector/pgvector:pg16`
- `DATABASE_URL=postgres://zeref:zeref@localhost:5432/zeref`
- `npm run verify:phase-3`
- No `ZEREF_LIVE_INSTAGRAM`, no live embed env

---

## Phase 4 (analyze + report)

**Contract:** [phase-4-contract.md](./phase-4-contract.md) (C17â€“C23) Â· **ADRs:** [011](./adr/ADR-011-openrouter-mock.md)â€“[014](./adr/ADR-014-verify-phase-4.md)

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

- `phase-4-contract.md`, ADR-011â€“014
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

**Contract:** [phase-5-contract.md](./phase-5-contract.md) (C24â€“C30) Â· **ADRs:** [015](./adr/ADR-015-globe-performance.md)â€“[018](./adr/ADR-018-verify-phase-5-harness.md)

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

**No live embed, LLM, or Instagram** in Phase 5 verify â€” prior phase env stripping still applies.

### What `verify:phase-5` checks

Script: `scripts/verify-phase-5.mjs`

- `phase-5-contract.md`, ADR-015â€“018, `docs/design/DESIGN_SYSTEM.md`
- `fixtures/phase-5/` including `cockpit-slices.fixture.json`
- **C24:** `PHASE5_CONTRACT_VERSION`, `CockpitSlicesSchema`
- **C27:** cockpit RSC pages call `getCockpitSlices()` from `@/lib/bff`
- **C30:** no voice/whisper/jarvis/`@zeref/instagram` imports in `apps/web`
- `npm run build` (includes Next production build)
- `@zeref/contracts` + `@zeref/web` unit tests
- **C28:** Playwright `cockpit-layout` â€” nav, 4 panels, globe canvas (Chromium)

### CI (C28)

After `verify:phase-4`:

- Install Playwright Chromium
- `ZEREF_BFF_FIXTURE=1`, `ZEREF_LLM_MOCK=1`
- `npm run verify:phase-5` (includes Playwright)

---

## Phase 6.1 (Luke Tier-2 HUD visual polish)

**Contract:** [phase-6.1-contract.md](./phase-6.1-contract.md) (C91â€“C98, Amendment N) Â· **ADR:** [033](./adr/ADR-033-luke-tier2-visual-acceptance.md)

Chains Phase 0â€“5.1 only â€” **independent** of `verify:phase-6` through `verify:phase-9`.

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
| `ZEREF_PHASE61_UI` | **`1`** â€” enforce `cockpit-hud-6.1.spec.ts` (C91â€“C94) + C48 regression via `cockpit-hud-5.1.spec.ts` |
| `ZEREF_PHASE51_UI` | **`1`** â€” required so C48 HUD tests are not skipped |
| `ZEREF_BFF_FIXTURE` | **`1`** â€” fixture BFF; no Postgres for Playwright path |

Does **not** require `ZEREF_PHASE6_VOICE`, `ZEREF_PHASE7_BRAIN`, or Phase 8â€“9 flags (C98).

### What `verify:phase-6.1` checks

Script: `scripts/verify-phase-6.1.mjs`

- `phase-6.1-contract.md`, ADR-033
- Reference screenshot `docs/design/reference/screenshots/zeref-cockpit-6.1-hud.png` (Planner sign-off artifact)
- Chains `verify:phase-5.1` (phases 0â€“5.1)
- **C96:** Playwright `cockpit-hud-5.1` (C48) + `cockpit-hud-6.1` (C91â€“C94) when `ZEREF_PHASE61_UI=1`

### CI (C98)

After `verify:phase-5.1`:

- `ZEREF_PHASE51_UI=1`, `ZEREF_PHASE61_UI=1`, `ZEREF_BFF_FIXTURE=1`, `ZEREF_LLM_MOCK=1`
- `npm run verify:phase-6.1`

---

## Phase 7 (zeref-memory + eventâ†’orb)

**Contract:** [phase-7-contract.md](./phase-7-contract.md) (C61â€“C70, Amendments Aâ€“D) Â· **ADRs:** [025](./adr/ADR-025-memory-postgres-schema.md)â€“[027](./adr/ADR-027-sse-brain-events-outbox.md)

Chains Phase 0â€“6, then Phase 7 unit checks and **hard-enforced** Playwright brain spec (Wave 4).

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
| `ZEREF_PHASE7_BRAIN` | **`1`** â€” enforce `cockpit-brain-7.spec.ts` |
| `ZEREF_PHASE6_VOICE` | **`1`** in CI |

**No browser memory write** â€” `@zeref/zeref-memory` only in server paths (`app/api/**`, `lib/memory/**`, `lib/cockpit/**`).

### What `verify:phase-7` checks

Script: `scripts/verify-phase-7.mjs`

- `phase-7-contract.md`, ADR-025â€“027
- `fixtures/phase-7/` memory + outbox goldens
- **C62:** `PHASE7_CONTRACT_VERSION` = `7.0.0`, brain event + outbox schemas
- **C70:** extends C30/C59 import guard â€” server-only `@zeref/zeref-memory`
- `@zeref/zeref-memory`, `@zeref/contracts`, `@zeref/jarvis-kernel`, `@zeref/web` tests (`memory-routes.test.mjs`)
- **C67:** Playwright `cockpit-brain-7` â€” `data-globe-brain-state`, `memory.saved` SSE (hard-fail unless `ZEREF_PHASE7_BRAIN=1`)

### CI (C70)

After `verify:phase-6` (Phase 6 mock flags: `ZEREF_WHISPER_MOCK`, `ZEREF_TTS_MOCK`, `ZEREF_BFF_FIXTURE`, `ZEREF_PHASE6_VOICE`, `ZEREF_PHASE51_UI`, `ZEREF_PLAYWRIGHT_REUSE`):

- `ZEREF_MEMORY_MOCK=1` (required)
- `ZEREF_PHASE7_BRAIN=1` (required) â€” `cockpit-brain-7` enforced
- `npm run verify:phase-7`

---

## Phase 8 (studio editor + calendar scheduler)

**Contract:** [phase-8-contract.md](./phase-8-contract.md) (C71â€“C80, Amendments Fâ€“J) Â· **ADRs:** [028](./adr/ADR-028-studio-drafts-editor.md)â€“[030](./adr/ADR-030-bff-job-enqueue.md)

Chains Phase 0â€“7, then Phase 8 contract/fixture/BFF checks. **Wave 2:** Playwright studio/calendar specs **skip until Wave 4** (P8-C/P8-D UI).

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

- `phase-8-contract.md`, ADR-028â€“030
- `fixtures/phase-8/` including `cockpit-slices.valid.json` (`phase8-cockpit-v1`)
- **C71:** `PHASE8_CONTRACT_VERSION` = `8.0.0`, calendar/studio/enqueue + `CockpitSlicesSchemaV8`
- **C73â€“C74:** BFF routes + `phase-8-routes.test.mjs`
- **C78:** extends C70 import guard (no snapshot mutation paths via instagram)
- **C75/C76:** Playwright scaffolds `cockpit-studio-8`, `cockpit-calendar-8` (skipped until Wave 4)
- `@zeref/contracts`, `@zeref/web` tests

### CI (C80)

After `verify:phase-7`:

- `ZEREF_PHASE8_PRODUCT=1`, `ZEREF_JOB_ENQUEUE_MOCK=1`, `ZEREF_BFF_FIXTURE=1` (+ Phase 6â€“7 mock flags)
- `npm run verify:phase-8`

---

## Phase 9 (research trend pipelines)

**Contract:** [phase-9-contract.md](./phase-9-contract.md) (C81â€“C90, Amendments Lâ€“M) Â· **ADRs:** [031](./adr/ADR-031-research-postgres-schema.md)â€“[032](./adr/ADR-032-research-worker-bff.md)

Chains Phase 0â€“8, then Phase 9 contract/fixture/BFF/worker checks. **Wave 4:** Playwright research spec **hard-enforced** when `ZEREF_PHASE9_RESEARCH=1` (P9-C + P9-E).

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
| `ZEREF_PHASE9_RESEARCH` | **`1`** (C90) | **enforced** â€” `cockpit-research-9.spec.ts` hard-fails on non-zero |
| `ZEREF_JOB_ENQUEUE_MOCK` | **`1`** | required (Amendment L) |
| `ZEREF_BFF_FIXTURE` | **`1`** | fixture BFF; no Postgres for Playwright path |
| Phase 8 flags | same as `verify:phase-8` | inherited in chain |

**Wave 4 (P9-E):** `wave4ResearchUiReady = true` in `cockpit-research-9.spec.ts`; `verify:phase-9` hard-fails when Playwright exits non-zero. Testids: `research-hub` on `/cockpit/research`, `panel-research` on `/cockpit`.

### What `verify:phase-9` checks

Script: `scripts/verify-phase-9.mjs`

- `phase-9-contract.md`, ADR-031â€“032
- `fixtures/phase-9/` including `cockpit-slices.valid.json` (`phase9-cockpit-v1`)
- **C81:** `PHASE9_CONTRACT_VERSION` = `9.0.0`, research + `CockpitSlicesSchemaV9`
- **C83:** `@zeref/worker` research handler unit test
- **C84â€“C85:** BFF routes + `phase-9-routes.test.mjs`
- **C87:** Playwright `cockpit-research-9` â€” `research-hub` + `panel-research` (hard-enforced)
- `@zeref/contracts`, `@zeref/worker`, `@zeref/web` tests

### CI (C90)

After `verify:phase-8`:

- `ZEREF_PHASE9_RESEARCH=1`, `ZEREF_JOB_ENQUEUE_MOCK=1`, `ZEREF_BFF_FIXTURE=1` (+ Phase 6â€“8 mock flags)
- `npm run verify:phase-9`

---

## P8 hotfix (Studio/Reports hub surfaces)

**Slices:** P8-HOTFIX-B @ `f52e0ef` (StudioHub), P8-HOTFIX-C @ `019e7bd` (ReportsHub + artifact detail) Â· **Pre-Phase-10 exit gate**

Chains `verify:phase-8` (full prior-phase env), then **hard-enforces** hub Playwright specs. Independent of `verify:phase-9` chain â€” but CI runs Phase 9 **before** this gate so regression on research e2e is caught first.

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
npm run verify:hotfix-p8
```

### Env flags

| Env | Default verify / CI | Enforcement |
|-----|---------------------|-------------|
| `ZEREF_PHASE8_PRODUCT` | **`1`** | required â€” hub e2e hard-fail on non-zero |
| `ZEREF_BFF_FIXTURE` | **`1`** | required â€” fixture BFF; no Postgres for Playwright path |
| `ZEREF_JOB_ENQUEUE_MOCK` | **`1`** | required (inherited from Phase 8) |
| Phase 6â€“7 flags | same as `verify:phase-8` | inherited in chain |

Does **not** require `ZEREF_PHASE9_RESEARCH` (hotfix gate chains Phase 8 only). **`verify:phase-9` must still pass** in CI and locally before Phase 10 â€” run it separately with full Phase 9 env.

### What `verify:hotfix-p8` checks

Script: `scripts/verify-hotfix-p8.mjs`

- Chains `verify:phase-8` (phases 0â€“8 regression)
- **P8-HOTFIX-B:** Playwright `cockpit-studio-hub` â€” `studio-hub` on `/cockpit/studio`
- **P8-HOTFIX-C:** Playwright `cockpit-reports-hub` â€” `reports-hub` on `/cockpit/reports`, `report-artifact-detail` on `/cockpit/reports?artifact=550e8400-e29b-41d4-a716-446655440000`
- Hard-fail on non-zero Playwright exit (no warn-only skip)

### CI (pre-Phase-10 gate)

After `verify:phase-9`:

- `ZEREF_PHASE8_PRODUCT=1`, `ZEREF_BFF_FIXTURE=1`, `ZEREF_JOB_ENQUEUE_MOCK=1` (+ Phase 6â€“7 mock flags)
- `npm run verify:hotfix-p8`

**Phase 10 BLOCKED** until this gate is green.

---

## Phase 10 (live ops & pipeline truth)

**Contract:** [phase-10-contract.md](./phase-10-contract.md) (C111â€“C124) Â· **ADR:** [036](./adr/ADR-036-live-ops-pipeline-truth.md)

Chains **`verify:hotfix-p8`** â†’ **`verify:phase-9`**, then Phase 10 contract/fixture/ops checks. Does **not** replace either prior gate â€” CI runs Phase 0â€“9 + hotfix **before** this step as well.

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
$env:ZEREF_PHASE10_OPS='1'
npm run verify:phase-10
```

### Env flags

| Env | Default verify / CI | Enforcement |
|-----|---------------------|-------------|
| `ZEREF_PHASE10_OPS` | **`1`** (C119) | required â€” `cockpit-ops-10.spec.ts` hard-fail on non-zero |
| `ZEREF_PHASE9_RESEARCH` | **`1`** | required in chain (Phase 9 regression) |
| `ZEREF_BFF_FIXTURE` | **`1`** | required â€” honest `consuming: false` / `source: fixture` |
| `ZEREF_JOB_ENQUEUE_MOCK` | **`1`** | required (inherited from Phase 8â€“9) |
| Phase 6â€“8 flags | same as `verify:phase-9` | inherited in chain |

Does **not** set `ZEREF_WORKER_AVAILABLE` in verify â€” fixture mode honestly reports worker absent.

### What `verify:phase-10` checks

Script: `scripts/verify-phase-10.mjs`

- `phase-10-contract.md`, ADR-036
- `fixtures/phase-10/worker-health.valid.json` round-trips `WorkerHealthResponseSchema` (C115)
- **C118:** chains `verify:hotfix-p8` then `verify:phase-9` (prior gates preserved)
- **C114:** `PHASE10_CONTRACT_VERSION` = `10.0.0`
- `@zeref/web` `phase-10-ops.test.mjs` (C113, C116â€“C117, C124)
- **C119:** Playwright `cockpit-ops-10` â€” `GET /api/v1/ops/worker-health` honest fixture response

### CI (C120)

After **Verify P8 hotfix**:

- `ZEREF_PHASE10_OPS=1`, `ZEREF_PHASE9_RESEARCH=1`, `ZEREF_JOB_ENQUEUE_MOCK=1`, `ZEREF_BFF_FIXTURE=1` (+ Phase 6â€“8 mock flags)
- `npm run verify:phase-10`

### C122 perf smoke (optional P10-D, advisory)

Operator UAT / warm timing uses **`next build && next start`** â€” not dev cold compile ([DEV_PERFORMANCE.md](../DEV_PERFORMANCE.md) Â§ Operator UAT).

| Budget | Value | Role |
|--------|-------|------|
| **C122 target** | **500ms** warm `GET /cockpit` | Documented Operator UAT target (DEV_PERFORMANCE warm range) |
| **C122 advisory** | **2000ms** | CI slack â€” `scripts/perf-smoke.mjs --advisory` warns only; **non-blocking** in `verify:phase-10` |

```powershell
npm run build
npm run start -w @zeref/web
node scripts/perf-smoke.mjs
```

In `verify:phase-10`, C122 runs **before** the C119 Playwright spec against a shared warm `next start` (`ZEREF_PLAYWRIGHT_REUSE=1` for e2e) so perf-smoke is not skipped after webServer teardown.

Standalone `perf-smoke.mjs` exits non-zero above advisory budget; `verify:phase-10` invokes `--advisory` mode and never fails on perf alone.

---

## Phase 10.5 (stabilize & instant)

**Contract:** [phase-10.5-contract.md](./phase-10.5-contract.md) (C125–C140) · **ADR:** [037](./adr/ADR-037-sse-outbox-consolidation.md) · [038](./adr/ADR-038-worker-health-real-probe.md)

Chains **`verify:phase-10`** (Phases 0–10 + hotfix preserved), then Phase 10.5 contract/unit/stability checks.

```powershell
cd c:\Projects\zeref
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_PHASE10_OPS='1'
$env:ZEREF_PHASE105_STABILITY='1'
npm run verify:phase-10.5
```

**User terminal only** for full gate + warm perf UAT (`next build && next start`; panel nav < 800ms).

### What `verify:phase-10.5` checks (P10.5-D)

Script: `scripts/verify-phase-10.5.mjs` (Wave 2)

- **C140:** chains `verify:phase-10` first
- `phase-10.5-contract.md`, ADR-037/038 present
- `@zeref/web` unit tests (ops + voice + events suites)
- Optional Playwright `cockpit-stability-10.5` — single EventSource / nav persistence (when `ZEREF_PHASE105_STABILITY=1`)
- **No regression** on C113–C124 honesty gates

### CI (after Wave 2)

After **Verify Phase 10**:

- `ZEREF_PHASE105_STABILITY=1` + inherited Phase 10 env
- `npm run verify:phase-10.5`

### Perf exit gates (operator UAT — not blocking CI by default)

| Metric | Target |
|--------|--------|
| Warm panel nav | **800ms** between cockpit panels (`next start`) |
| Button feedback | **100ms** optimistic enqueue/save/schedule |
| C122 advisory | 500ms target / 2000ms advisory (carry-forward) |

---

## Phase 11 (agentic JARVIS)

**Contract:** [phase-11-contract.md](./phase-11-contract.md) (C141–C162) · **ADR:** [039](./adr/ADR-039-jarvis-core-extraction-mcp-tools.md) · [040](./adr/ADR-040-agent-loop-budgets-capability-audit.md) · [041](./adr/ADR-041-jarvis-eval-harness.md)

Chains **`verify:phase-10.5`** (Phases 0–10.5 preserved), then JARVIS kernel tests + eval/e2e when P11-D lands.

```powershell
cd c:\Projects\zeref
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_PHASE10_OPS='1'
$env:ZEREF_PHASE11_AGENT='1'
$env:ZEREF_JOB_ENQUEUE_MOCK='1'
npm run verify:phase-11
```

**User terminal only** for full gate. Eval golden set edits require human approval.

### What `verify:phase-11` checks

Script: `scripts/verify-phase-11.mjs`

- **C159:** chains `verify:phase-10.5` first
- `phase-11-contract.md`, ADR-039/040/041 present
- `@zeref/jarvis-kernel` unit tests
- **C160:** eval harness when `eval/jarvis/run-eval.mjs` exists (P11-D) — **0 unsafe actions** hard-fail
- **C161:** Playwright `jarvis-agent-11.spec.ts` when `ZEREF_PHASE11_AGENT=1` (P11-D)

### Wave 1 smoke (after P11-A)

```powershell
npm run build -w @zeref/jarvis-kernel
npm test -w @zeref/jarvis-kernel
```

### CI (after Wave 3 P11-D)

After **Verify Phase 10.5**:

- `ZEREF_PHASE11_AGENT=1` + inherited Phase 10.5 env
- `npm run verify:phase-11`
