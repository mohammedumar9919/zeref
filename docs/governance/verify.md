# Zeref — Verification commands

This page documents verification commands per phase. CI must fail if these commands fail.

**Related:** [Phase 1 contract](./phase-1-contract.md) (C1–C6) · [ADR index](./adr/README.md)

## Phase 0 (foundation scaffold)

Run from the repo root.

```powershell
npm install
npm run build
npm run lint
npm run verify:phase-0
```

### What each command checks

- **`npm run build`**: Builds the TypeScript project using `tsc -b` (project references).
- **`npm run lint`**: Phase 0 lint/typecheck gate (currently `tsc -b ... --noEmit`).
- **`npm run verify:phase-0`**: Asserts required Phase 0 scaffold paths exist and runs `@zeref/contracts` smoke tests.

## Phase 1 (contracts + snapshot DB skeleton)

**Contract:** [phase-1-contract.md](./phase-1-contract.md) · **ADRs:** [ADR-001](./adr/ADR-001-snapshot-data-model.md), [ADR-002](./adr/ADR-002-id-branding.md), [ADR-003](./adr/ADR-003-openapi-from-zod.md)

Run from the repo root. Requires **Postgres 16** (see `docker-compose.yml`).

```powershell
docker compose up -d db
npm install
npm run verify:phase-0
npm run verify:phase-1
```

Optional: set `DATABASE_URL` if Postgres is not on `localhost:5432`. Skip DB tests only for local debugging: `SKIP_DB_TESTS=1 npm run verify:phase-1` (not used in CI).

### What each command checks

- **`npm run verify:phase-1`** (script: `scripts/verify-phase-1.mjs`):
  - Asserts `docs/governance/phase-1-contract.md`, [ADR-001/002/003](./adr/README.md), and `fixtures/phase-1/*.json` exist
  - Runs `npm run build`
  - Asserts `PHASE1_CONTRACT_VERSION` in built `@zeref/contracts`
  - Runs `@zeref/contracts` tests (fixture round-trips, raw-blob rejection — C4/C6)
  - Asserts Phase 1 migrations exist and contain **no pgvector** (C5)
  - Runs `@zeref/db` migration tests (apply migrations to ephemeral DB on Postgres 16)

### CI (C3)

On every push and PR, after Phase 0 verify:

- `npm run verify:phase-1` with `DATABASE_URL` pointing at the workflow Postgres 16 service

