# CI setup — Zeref phase gates

**Workflow:** [.github/workflows/ci.yml](../.github/workflows/ci.yml)

---

## What CI runs (every push/PR)

| Step | Command | Notes |
|------|---------|-------|
| Build | `npm run build` | tsc + Next.js |
| Lint | `npm run lint` | Typecheck |
| Verify 0–4 | `npm run verify:phase-0` … `verify:phase-4` | Postgres service on 5432 |
| Playwright install | `npm -w @zeref/web run test:e2e:install` | Chromium |
| Verify 5 | `npm run verify:phase-5` | `ZEREF_BFF_FIXTURE=1`, `ZEREF_LLM_MOCK=1` |

**Gap (ZR-005):** Phase 5 does not test BFF against live seeded Postgres in CI.

---

## Local full gate (authoritative)

```powershell
cd c:\Projects\zeref
docker compose up -d db

$env:DATABASE_URL = 'postgres://zeref:zeref@localhost:5432/zeref'
$env:ZEREF_LLM_MOCK = '1'
$env:ZEREF_BFF_FIXTURE = '1'

.\scripts\phase_gate.ps1 -Phase 5
```

Equivalent manual:

```powershell
npm run verify:phase-0
npm run verify:phase-1
npm run verify:phase-2
npm run verify:phase-3
npm run verify:phase-4
npm run verify:phase-5
```

---

## Environment variables

| Variable | CI | Local dev | Purpose |
|----------|-----|-----------|---------|
| `DATABASE_URL` | `localhost:5432` | `localhost:5432` (or `POSTGRES_PORT`) | Postgres |
| `ZEREF_LLM_MOCK` | `1` | `1` for gate | Mock OpenRouter |
| `ZEREF_BFF_FIXTURE` | `1` | `1` for fast UI gate | Fixture cockpit slices |
| `SKIP_DB_TESTS` | not set | `1` debug only | Skip DB tests |
| `ZEREF_LIVE_INSTAGRAM` | never | optional Phase 2 | Live scrape |

---

## Phase gate script

`scripts/phase_gate.ps1` runs cumulative verify through `-Phase N`.

**Status:** content documented in [PORTABLE_AGENT_STACK_SETUP.md](./PORTABLE_AGENT_STACK_SETUP.md) — commit pending if not on disk.

---

## Never in CI

- Live Instagram scrape without fixture
- Live OpenRouter / OpenAI without mock flags
- Long interactive Playwright debug sessions

---

## Related

- [governance/verify.md](./governance/verify.md)
- [TOOLING_INDEX.md](./TOOLING_INDEX.md)
