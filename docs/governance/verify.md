# Zeref — Verification commands

CI must fail if these commands fail.

**Related:** [ADR index](./adr/README.md) · [Phase 1 contract](./phase-1-contract.md) · [Phase 2 contract](./phase-2-contract.md)

## Environment: `DATABASE_URL`

Phase 1 and Phase 2 gates run `@zeref/db` and `@zeref/worker` tests against **Postgres 16**.

| Context | `DATABASE_URL` |
|---------|----------------|
| **Local (docker-compose default)** | `postgres://zeref:zeref@localhost:5432/zeref` |
| **Custom port** | Set `POSTGRES_PORT` in `.env` or compose override, then match host port in URL |
| **CI (GitHub Actions)** | `postgres://zeref:zeref@localhost:5432/zeref` (service container) |
| **Skip DB (debug only)** | `SKIP_DB_TESTS=1` — not used in CI |

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
```

## Full Phase 0–2 gate (orchestrator)

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
npm install
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
```

**Q3 / live Instagram:** Do **not** set `ZEREF_LIVE_INSTAGRAM` for the default gate or CI. See [ADR-006](./adr/ADR-006-parse-fetch-live.md).

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

Requires `DATABASE_URL` (see above).

```powershell
npm run verify:phase-0
npm run verify:phase-1
```

- **`verify:phase-1`** (`scripts/verify-phase-1.mjs`): contract, ADRs, `fixtures/phase-1/`, migrations, no pgvector (C5), `@zeref/db` tests

---

## Phase 2 (Instagram collectors → snapshots)

**Contract:** [phase-2-contract.md](./phase-2-contract.md) · **ADRs:** [004](./adr/ADR-004-instagram-merge.md), [005](./adr/ADR-005-worker-collect.md), [006](./adr/ADR-006-parse-fetch-live.md)

Requires `DATABASE_URL` for worker collect integration tests.

```powershell
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
```

### Q3: `ZEREF_LIVE_INSTAGRAM` (live fetch — local only)

| Value | Behavior |
|-------|----------|
| **unset** (default, CI) | Parse + merge + Graph **fixtures** only; Playwright fetch skipped |
| **`1`** | Enables live `fetchPostPage` smoke in `@zeref/instagram` — run separately, not in CI |

```powershell
# Optional — after default gate passes
$env:ZEREF_LIVE_INSTAGRAM='1'
npm -w @zeref/instagram test
```

`verify-phase-2.mjs` **removes** `ZEREF_LIVE_INSTAGRAM` from the child process env (ADR-006 / Q3).

### What `verify:phase-2` checks

Script: `scripts/verify-phase-2.mjs`

- `phase-2-contract.md`, ADR-004/005/006, `fixtures/phase-2/html/`, `fixtures/phase-2/graph/`
- `scripts/enqueue-collect.mjs`, `@zeref/instagram`
- `PHASE2_CONTRACT_VERSION`, `CollectJobOutputSchema` (C7)
- Worker registry **collect-only** (C9)
- `@zeref/contracts`, `@zeref/instagram`, `@zeref/worker` tests

### CI (C10)

After `verify:phase-1`, with `DATABASE_URL` on Postgres 16 — **no** `ZEREF_LIVE_INSTAGRAM`.
