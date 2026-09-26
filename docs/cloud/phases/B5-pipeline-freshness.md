# CLOUD-B5 — Live pipeline freshness (bulk Graph collect)

**Queue ID:** CLOUD-B5  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Partial — script + docs; live run needs human `INSTAGRAM_*` + Postgres  
**Depends on:** CLOUD-B2 DONE; live tokens already on laptop  
**Branch prefix:** `cloud/b5-`

## Goal

Account has **many Graph media** but cockpit often shows **one stale entity**. Ship a laptop-safe script that lists recent `graph.instagram.com` media and runs collect → normalize → analyze (+ report) for the newest N posts not already snapshotted — so Studio / Reports / Research refresh without TRACK-B-DEFER.

## Human prerequisites

- `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_GRAPH_USER_ID` in env / `.env` / `.env.local`
- `DATABASE_URL` → zeref Postgres (Docker `:55432` on this laptop)
- Worker packages built (`npm run build -w @zeref/worker -w @zeref/instagram`)

## Allowed paths

- `scripts/uat-collect-recent.mjs` (create) — `--limit N` (default 5); lists `/{user-id}/media`; skips media ids already in `snapshots.payload_json->graph->id`; runs same pipeline as `uat-collect.mjs` per media; never prints tokens
- `scripts/live-collect-recent.ps1` (optional) — loads env, runs the node script
- `docs/LIVE_INSTAGRAM_SETUP.md` — short “Bulk recent collect” pointer
- `docs/cloud/phases/B5-pipeline-freshness.md` (this file)
- `docs/cloud/QUEUE.md`, `docs/cloud/AGENT_LOG.md`, `docs/CURRENT_STATE.md`, `docs/cloud/MASTERPLAN.md` (status only)

## Forbidden

- Committing secrets / `.env`
- Blind “fetch all forever” without `--limit`
- Meta publish / App Review / Next 16 / auth / vector (`TRACK-B-DEFER`)
- Scraping / Playwright live IG
- Rewriting collect contracts unless a real bug blocks the script

## Acceptance

- [x] Soft-fail with hint when `INSTAGRAM_ACCESS_TOKEN` missing (hint string present; live path exercised with tokens)
- [x] With tokens: collects up to `--limit` newest unseen media; prints redacted summary (ids truncated, counts) — laptop UAT 2026-09-17 collected 5 / skipped 1 known
- [x] Cockpit slices show more than one studio item after run (6 studio / 7 reports)
- [x] Docs pointer in LIVE_INSTAGRAM_SETUP.md
- [ ] AGENT_LOG + PR; Planner merges

## Grok claim steps

1. Branch `cloud/b5-<short>`
2. QUEUE → `IN_PROGRESS` + AGENT_LOG start
3. Implement allowed paths only
4. PR → `PR_READY` + URL in AGENT_LOG
5. Do **not** mark DONE; do **not** start TRACK-B-DEFER
