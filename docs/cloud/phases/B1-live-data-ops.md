# CLOUD-B1 — Live data operator path (no token required to merge)

**Queue ID:** CLOUD-B1  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Yes — scripts + small BFF ops probe  
**Depends on:** B0 docs (can parallel); live Graph UAT needs human tokens later

## Goal

Ship a Windows one-command **live data** start path (Postgres + worker + web, fixture OFF) and an Instagram token **presence/reachability** health probe. CI stays fixture-safe.

## Allowed paths

- `scripts/live-data-start.ps1` (create)
- `apps/web/app/api/v1/ops/instagram-health/**` (create)
- `apps/web/lib/ops/**` or `apps/web/lib/instagram-health.ts` (create helper)
- `apps/web/test/**` (unit tests for helper — mock fetch, no live Graph in CI)
- `.env.example` (ops comments)
- `docs/LIVE_INSTAGRAM_SETUP.md` (link to script only if B0 already created)
- `docs/cloud/AGENT_LOG.md`, `docs/cloud/QUEUE.md` status on branch
- `docs/DEV_PERFORMANCE.md` or `docs/CURRENT_STATE.md` one-line pointer

## Forbidden

- Unsetting fixture in CI / Playwright defaults
- Publishing to Instagram / App Review code
- Scraping / Playwright live IG scrape
- Next 16, auth, vector memory
- Rewriting collect pipeline contracts
- Committing secrets

## Acceptance

- [ ] `.\scripts\live-data-start.ps1` requires `DATABASE_URL` + documents Instagram env; sets `ZEREF_WORKER_AVAILABLE=1`; does **not** set `ZEREF_BFF_FIXTURE`; starts `npm run dev:stack` or equivalent documented stack
- [ ] `GET /api/v1/ops/instagram-health` returns `{ configured, reachable?, userId?, error? }` — when token missing: `configured:false` 200; when present: optional Graph `/me` probe (timeout ~5s)
- [ ] Unit test covers missing-token path
- [ ] AGENT_LOG + PR
