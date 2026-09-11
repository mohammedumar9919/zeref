# CLOUD-A0 — Demo ops (remote-safe subset)

**Queue ID:** CLOUD-A0  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Partial — docs/fixtures/scripts only  
**Worker:** claimed 2026-09-11 on `cloud/a0-demo-fixtures` (see [QUEUE.md](../QUEUE.md))

## Goal

Make fixture demo deterministic for Cloud + laptop without requiring Docker password fixes.

## Allowed paths

- `fixtures/**`
- `docs/CURRENT_STATE.md`, `docs/GAP_BACKLOG.md`, `docs/cloud/**`, `docs/REMOTE_AGENTS.md`
- `scripts/demo-start.ps1` (create if missing — PowerShell one-liner docs OK)
- `.env.example` (comments only)

## Forbidden

- `apps/**` product logic (unless tiny fixture id constant docs)
- Real API keys
- Docker volume wipe commands that destroy data without documenting first

## Acceptance

- [x] Documented one-command fixture start for Windows + note for Cloud (`ZEREF_BFF_FIXTURE=1` already in Secrets)
- [x] Fixture studio entity id documented (from CURRENT_STATE)
- [x] GAP_BACKLOG stale “Phase 7 OPEN” corrected if you touch that file
- [ ] AGENT_LOG entry + PR *(PR_READY on same branch; Planner marks DONE)*

### Windows (laptop)

```powershell
.\scripts\demo-start.ps1
```

Sets fixture/mock flags, prints the studio entity URL, starts `npm run dev -w @zeref/web`. **No Docker. Does not wipe volumes.**

### Cloud

Runtime Secrets already include `ZEREF_BFF_FIXTURE=1` (plus the other fixture mocks). Start:

```
npm run dev -w @zeref/web
```

Do not copy a laptop `.env`. Do not run destructive `docker compose down -v` from a cloud session.

### Fixture studio entity id

`550e8400-e29b-41d4-a716-446655440001`

URL: `/cockpit/studio/550e8400-e29b-41d4-a716-446655440001`  
See [../../CURRENT_STATE.md](../../CURRENT_STATE.md) and [../../../fixtures/README.md](../../../fixtures/README.md).

## Laptop leftover

Postgres password reset / `docker compose` volume recreate. Document before any volume wipe; this card does **not** run those commands.
