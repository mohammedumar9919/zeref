# Zeref

**Research and approval platform** — investigate, draft, review, then publish. Every outbound action stays behind a human approval step.

TypeScript monorepo with a Next.js control room, background workers, Postgres, Playwright browser automation, and a gated CI pipeline.

## What it does

1. **Collect** — snapshot data from configured sources (browser automation where needed)
2. **Normalize & embed** — immutable snapshots through a typed pipeline
3. **Analyze & report** — research summaries and recommendations
4. **Approve** — human-in-the-loop gate before anything is acted on
5. **Operate** — cockpit UI for live status, calendar, studio tools

## Stack

| Layer | Technology |
|-------|------------|
| Monorepo | npm workspaces, TypeScript 5.9, Node 22+ |
| UI | Next.js, Playwright e2e |
| Workers | Node job runners, optional Whisper sidecar |
| Data | PostgreSQL (+ pgvector), typed `@zeref/contracts` package |
| Automation | Playwright (Chromium) |
| CI | GitHub Actions — build, lint, phase verify scripts 0–12 |
| Local | Docker Compose (Postgres) |

## Architecture principles

- **Snapshot immutability** — no re-scrape inside normalize / embed / analyze
- **Contracts first** — shared JSON shapes in `packages/contracts`
- **BFF pattern** — browser talks to Next.js API routes, not raw workers
- **Mockable AI** — `ZEREF_LLM_MOCK` and related flags for CI without live keys

## Quick start

```powershell
cd zeref
npm install
docker compose up -d
npm run verify:phase-0
```

Full pipeline verification (with mocks):

```powershell
$env:ZEREF_LLM_MOCK = "1"
$env:ZEREF_BFF_FIXTURE = "1"
npm run verify:phase-5
```

Dev stack:

```powershell
npm run dev:stack
```

## Repo layout

| Path | Role |
|------|------|
| `apps/web/` | Next.js cockpit UI |
| `apps/worker/` | Background job handlers |
| `apps/whisper/` | Speech-to-text sidecar |
| `packages/contracts/` | Shared types / OpenAPI shapes |
| `packages/db/` | Schema and migrations |
| `scripts/verify-phase-*.mjs` | Phase gate automation |

## Quality

- 14+ Playwright e2e specs
- Phase-gated verify scripts through Phase 12
- CI workflow on every push

## Author

Mohammed Umar Salam — [Portfolio](https://mohammedumar9919.github.io)

## License

MIT — see [LICENSE](LICENSE).
