# CLOUD-B4 — Live Facebook competitor UAT glue

**Queue ID:** CLOUD-B4  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Yes — scripts + docs (live BD needs human `FACEBOOK_*`)  
**Depends on:** CLOUD-B3 DONE; human Page-linked IG + Facebook User token  
**Branch prefix:** `cloud/b4-`

## Goal

Ship a **laptop-safe UAT path** for Business Discovery after B3: one script to probe BD + optional Jarvis tool smoke, docs link from LIVE_COMPETITOR_SETUP, and health check that reports `businessDiscovery` clearly. CI stays fixture-safe (no live FB calls).

## Human prerequisites (LAPTOP — parallel)

Follow [../LIVE_COMPETITOR_SETUP.md](../LIVE_COMPETITOR_SETUP.md):

1. IG Professional linked to Facebook Page  
2. Facebook Login for Business on same Meta app (keep Instagram Login)  
3. Long-lived `FACEBOOK_ACCESS_TOKEN` + `FACEBOOK_IG_BUSINESS_ID` in root `.env` **and** `apps/web/.env.local`  
4. Curl smoke in that doc must succeed before marking live UAT done

## Allowed paths

- `scripts/uat-competitor.mjs` (create) — CLI: `--username nasa` (or similar public Business/Creator); prints redacted summary (followers, media count, top N likes); exit 0 on success; never print token
- `scripts/live-competitor-check.ps1` (optional) — loads DATABASE_URL not required; reminds env; runs `node scripts/uat-competitor.mjs`
- `docs/LIVE_COMPETITOR_SETUP.md` — add “UAT script” section pointing at the script
- `docs/cloud/phases/B4-competitor-uat.md` (this file)
- `docs/cloud/QUEUE.md`, `docs/cloud/AGENT_LOG.md`, `docs/CURRENT_STATE.md` (pointer)
- `apps/web/lib/ops/facebook-health.ts` — ensure response includes `businessDiscovery: boolean` when probe succeeds (extend if missing)
- `apps/web/test/facebook-health.test.mjs` — mock coverage only
- `.env.example` — only if a comment pointer to the UAT script is missing

## Forbidden

- Committing `FACEBOOK_*` / `.env` / `.env.local`
- Scraping / Playwright live IG
- Meta publish / App Review / Next 16 / auth / vector (`TRACK-B-DEFER`)
- Rewriting B3 BD client contracts unless a real bug blocks UAT
- Marking live UAT DONE without human curl success (Planner/laptop confirms)

## Acceptance

- [ ] `node scripts/uat-competitor.mjs --username <public_biz>` works when `FACEBOOK_*` set; fails soft with hint when missing
- [ ] Docs section for the UAT script in LIVE_COMPETITOR_SETUP.md
- [ ] `GET /api/v1/ops/facebook-health` documents / returns `businessDiscovery` when configured
- [ ] Unit tests mock-only (CI green)
- [ ] AGENT_LOG + PR; Planner merges; human records live curl OK in AGENT_LOG before calling UAT complete

## Grok claim steps

1. Branch `cloud/b4-<short>`
2. QUEUE → `IN_PROGRESS` + AGENT_LOG start
3. Implement allowed paths only
4. PR → `PR_READY` + URL in AGENT_LOG
5. Do **not** mark DONE; do **not** claim live Graph without human tokens
