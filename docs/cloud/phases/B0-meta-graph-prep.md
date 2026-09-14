# CLOUD-B0 — Live Instagram Graph setup (docs)

**Queue ID:** CLOUD-B0  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Yes — docs only  
**Depends on:** Track A DONE; human Meta app (parallel)

## Goal

Document exact Meta Developer + token steps so a human can produce `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_GRAPH_USER_ID` for Zeref’s `graph.instagram.com` collect path. No publish / App Review.

## Allowed paths

- `docs/LIVE_INSTAGRAM_SETUP.md` (create)
- `docs/cloud/phases/B0-meta-graph-prep.md` (this file / sync)
- `docs/cloud/QUEUE.md`, `docs/cloud/AGENT_LOG.md`, `docs/cloud/MASTERPLAN.md`, `docs/cloud/README.md`
- `docs/CURRENT_STATE.md` (Track B pointer only)
- `.env.example` (comments for INSTAGRAM_* only)
- `README.md` (short Live Graph pointer)

## Forbidden

- `apps/**` product code
- Committing secrets / `.env.local`
- Meta publish APIs, scraping, unlabeled fixture-as-live
- Next 16, auth, vector memory, App Review

## Acceptance

- [ ] `docs/LIVE_INSTAGRAM_SETUP.md` with: Professional IG account, Meta app, Instagram API w/ Instagram Login, tester role, curl `/me` + `/media`, long-lived token, where to put env vars, college fixture vs live `dev:stack` modes
- [ ] `.env.example` documents both Instagram vars clearly
- [ ] AGENT_LOG append + QUEUE row updated by Planner after merge
