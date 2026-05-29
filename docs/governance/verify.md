# Zeref — Verification commands

CI must fail if these commands fail.

**Related:** [ADR index](./adr/README.md) · [Phase 1](./phase-1-contract.md) · [Phase 2](./phase-2-contract.md) · [Phase 3](./phase-3-contract.md)

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

## Full Phase 0–3 gate (orchestrator)

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
npm install
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
npm run verify:phase-3
```

**Do not set for default gate or CI:**

- `ZEREF_LIVE_INSTAGRAM` — live Instagram fetch (Phase 2; see [ADR-006](./adr/ADR-006-parse-fetch-live.md))
- `OPENAI_API_KEY`, `ZEREF_NOMIC_EMBED_URL`, or non-mock `ZEREF_EMBED_PROVIDER` — live embed (Phase 3; see [ADR-010](./adr/ADR-010-verify-phase-3-harness.md))

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
- **C12:** worker registry `collect` + `normalize` + `embed` only
- **C14:** static guard — no `@zeref/instagram` in normalize/embed modules ([ADR-009](./adr/ADR-009-worker-normalize-boundaries.md))
- **C16:** migration enables pgvector + `vector(1536)` ([ADR-007](./adr/ADR-007-embedding-provider.md))
- `@zeref/contracts`, `@zeref/analytics` (retrieval@3 ≥ 1.0), `@zeref/db`, `@zeref/worker` tests

### CI (C13)

After `verify:phase-2`:

- Postgres service: `pgvector/pgvector:pg16`
- `DATABASE_URL=postgres://zeref:zeref@localhost:5432/zeref`
- `npm run verify:phase-3`
- No `ZEREF_LIVE_INSTAGRAM`, no live embed env
