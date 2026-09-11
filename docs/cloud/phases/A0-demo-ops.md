# CLOUD-A0 — Demo ops (remote-safe subset)

**Queue ID:** CLOUD-A0  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Partial — docs/fixtures/scripts only

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

- [ ] Documented one-command fixture start for Windows + note for Cloud (`ZEREF_BFF_FIXTURE=1` already in Secrets)
- [ ] Fixture studio entity id documented (from CURRENT_STATE)
- [ ] GAP_BACKLOG stale “Phase 7 OPEN” corrected if you touch that file
- [ ] AGENT_LOG entry + PR

## Laptop leftover

Postgres password reset / `docker compose` volume recreate.
