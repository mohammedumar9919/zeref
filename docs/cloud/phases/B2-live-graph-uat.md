# CLOUD-B2 — Live Graph collect UAT (human tokens)

**Queue ID:** CLOUD-B2  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Partial — laptop must have Postgres + tokens; Cloud Agents must not use real tokens  
**Depends on:** B0 DONE, B1 DONE, human `INSTAGRAM_*` in local `.env`

## Goal

Prove live Graph collect end-to-end: token health → `dev:stack` / `live-data-start` → collect job → cockpit data-age not stuck on fixture.

## Human steps (before / with worker)

1. Put **long-lived** token + user id in root `.env` **and** `apps/web/.env.local` (never commit, never paste into chat).
2. `docker compose up -d` (Postgres) if not already running.
3. `.\scripts\live-data-start.ps1`
4. Open `http://localhost:3000/api/v1/ops/instagram-health` — expect `configured:true`, `reachable:true`.
5. Trigger collect (worker schedule or manual enqueue per Phase 12 docs) and confirm panels show **live** / **stale** data-age (not fixture).

## Allowed paths (worker)

- `docs/cloud/phases/B2-*.md`, `docs/cloud/AGENT_LOG.md`, `docs/cloud/QUEUE.md`
- `docs/LIVE_INSTAGRAM_SETUP.md` (UAT checklist section only)
- `scripts/**` small UAT helpers (no secrets)
- `apps/worker/**` only if collect glue is broken (minimal fix)
- `apps/web/lib/**` / ops only if health probe needs fix

## Forbidden

- Committing tokens
- Meta publish / App Review
- Claiming fixture numbers as live
- Next 16 / auth / vector memory

## Acceptance

- [ ] Instagram health reachable with local tokens
- [ ] Live stack starts without `ZEREF_BFF_FIXTURE`
- [ ] At least one successful Graph collect into Postgres
- [ ] Cockpit data-age reflects non-fixture state for collected items
- [ ] AGENT_LOG + QUEUE DONE by Planner after laptop UAT sign-off
