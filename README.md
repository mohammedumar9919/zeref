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

## Demo (college / fixture)

**Title:** ZEREF — An Autonomous JARVIS Command Center for Instagram Growth

College talk materials live in [docs/submission/](docs/submission/) (abstract, 4-beat script, slide outline). This section is how to **run** the same fixture demo the script uses. Video recording is laptop-only.

Windows, no Docker, no live Instagram or LLM keys — **production start** (instant nav):

```powershell
.\scripts\demo-start.ps1
```

That builds once, then `next start` with fixture mocks. For hot-reload coding use `.\scripts\demo-start-dev.ps1` (turbopack; first compile still slower).

**Live AI voice** (fixture panels stay honest): put keys in `apps/web/.env.local`, then see [docs/LIVE_VOICE_SETUP.md](docs/LIVE_VOICE_SETUP.md) and run `.\scripts\live-voice-start.ps1`.

Then open:

| Surface | URL |
|---------|-----|
| Command center | http://localhost:3000/cockpit |
| Studio (LOG240 fixture) | http://localhost:3000/cockpit/studio/550e8400-e29b-41d4-a716-446655440001 |
| Calendar | http://localhost:3000/cockpit/calendar |
| Reports | http://localhost:3000/cockpit/reports?artifact=550e8400-e29b-41d4-a716-446655440000 |
| Research intel | http://localhost:3000/cockpit/research |

**What the demo shows:** JARVIS HUD, Studio / Calendar / Reports / Research, fixture outlier **HIT999** (5.5× own-account median), weekly brief, PTT if the mic works.

**What it does not show:** live Instagram publish (not built), unlabeled live Graph metrics, or a typed JARVIS chat box. If PTT fails, click Research — same intel. Badges that say Fixture or SIMULATED are correct, not a bug.

Manual equivalent: `$env:ZEREF_BFF_FIXTURE='1'; $env:ZEREF_JOB_ENQUEUE_MOCK='1'; npm run dev -w @zeref/web`. Cloud Agents already have fixture Secrets — do not copy a laptop `.env`. See [fixtures/README.md](fixtures/README.md).

## Live Graph (operator laptop)

Meta Developer + Instagram Login token steps: [docs/LIVE_INSTAGRAM_SETUP.md](docs/LIVE_INSTAGRAM_SETUP.md). Client host is `https://graph.instagram.com`. Put `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_GRAPH_USER_ID` in root `.env` **and** `apps/web/.env.local`. Live mode: fixture OFF + Postgres + `.\scripts\live-data-start.ps1` (CLOUD-B1). College talks stay on `demo-start.ps1` — never commit tokens; publish is not claimed.

## Repo layout

| Path | Role |
|------|------|
| `apps/web/` | Next.js cockpit UI |
| `apps/worker/` | Background job handlers |
| `apps/whisper/` | Speech-to-text sidecar |
| `packages/contracts/` | Shared types / OpenAPI shapes |
| `packages/db/` | Schema and migrations |
| `scripts/verify-phase-*.mjs` | Phase gate automation |

## Remote / phone agents

**Cloud track (Grok Bot home):** [docs/cloud/README.md](docs/cloud/README.md)  
Also: [docs/REMOTE_AGENTS.md](docs/REMOTE_AGENTS.md) · `.cursor/environment.json`

## Quality

- 14+ Playwright e2e specs
- Phase-gated verify scripts through Phase 12
- CI workflow on every push

## Author

Mohammed Umar Salam — [Portfolio](https://mohammedumar9919.github.io)

## License

MIT — see [LICENSE](LICENSE).
