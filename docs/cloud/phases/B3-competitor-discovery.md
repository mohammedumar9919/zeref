# CLOUD-B3 — Competitor discovery + reel-idea research

**Queue ID:** CLOUD-B3  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Yes — code + docs (live Graph competitor needs human Facebook Login token)  
**Depends on:** B0–B2 DONE; human FB Page–linked IG + Facebook User token for live UAT  
**Branch prefix:** `cloud/b3-`

## Goal

Enable Jarvis to research **named Instagram professional competitors** via Meta **Business Discovery** (Facebook Login / `graph.facebook.com`) and produce **reel-making briefs** (top competitor media + hooks). Keep existing Instagram Login Insights path (`graph.instagram.com`) intact — **two tokens, two hosts**.

Also harden **web-intel** `research_external_trends` so viral / market asks do not fall back to empty own-account 5× outliers.

## Why (do not re-litigate)

| Capability | Host | Token |
|------------|------|-------|
| Own media + Insights | `graph.instagram.com` | `INSTAGRAM_ACCESS_TOKEN` (already live) |
| Competitor Business Discovery | `graph.facebook.com` | **New** Facebook User token + Page-linked IG |
| City viral audio charts | — | **Not a Meta Graph product** — web-intel only |

Probe already proved: `business_discovery` on Instagram Login returns *Tried accessing nonexisting field*.

## Human prerequisites (LAPTOP — not Grok)

Document in `docs/LIVE_COMPETITOR_SETUP.md` (Grok writes the doc; human executes):

1. Instagram Professional account linked to a **Facebook Page**.
2. Same Meta app: add **Facebook Login for Business** (keep Instagram Login product — do not remove).
3. App roles: user can manage the Page; IG tester/admin as Meta requires for Development.
4. User token permissions (request at login / Graph Explorer as applicable):
   - `instagram_basic`
   - `pages_read_engagement`
   - `instagram_manage_insights` (if pulling competitor media metrics fields Meta allows)
   - If Page role via Business Manager: also `ads_read` **or** `ads_management` (Meta requirement)
5. Resolve **your** IG user id on Facebook Graph (Page → `instagram_business_account` id) — this is the **querying** id for Business Discovery (not the competitor’s id).
6. Long-lived Facebook User token → env (never commit):
   - `FACEBOOK_ACCESS_TOKEN`
   - `FACEBOOK_IG_BUSINESS_ID` (your IG business account id used as BD query root)
7. Curl must succeed before live UAT:

```bash
curl -sS "https://graph.facebook.com/v21.0/FACEBOOK_IG_BUSINESS_ID?fields=business_discovery.username(nasa){username,followers_count,media_count}&access_token=FACEBOOK_ACCESS_TOKEN"
```

Replace `nasa` with any public IG **Business/Creator** username for the smoke.

## Allowed paths (Grok)

### Docs / queue
- `docs/LIVE_COMPETITOR_SETUP.md` (create)
- `docs/LIVE_INSTAGRAM_SETUP.md` (short pointer to competitor doc only)
- `docs/cloud/phases/B3-competitor-discovery.md` (this file)
- `docs/cloud/QUEUE.md`, `docs/cloud/AGENT_LOG.md`, `docs/CURRENT_STATE.md` (one Track B pointer)
- `.env.example` (FACEBOOK_* comments only)

### Instagram package
- `packages/instagram/src/graph/**` (add Facebook Graph Business Discovery client; do not break Instagram Login client)
- `packages/instagram/src/index.ts` / `graph/index.ts` exports
- `packages/instagram/test/**` (mock fetch only — no live Graph in CI)
- `fixtures/**` competitor BD fixture JSON if needed

### Contracts + Jarvis
- `packages/contracts/src/phase6/jarvis-turn.ts` — add tool name(s) to `JarvisToolNameSchema`
- `packages/contracts/test/phase-11.test.mjs` — EXPECTED_TOOLS list
- `packages/jarvis-kernel/src/zeref/tool-descriptors.ts`
- `packages/jarvis-kernel/src/zeref/tool-executor.ts`
- `packages/jarvis-kernel/src/zeref/context.ts`
- `packages/jarvis-kernel/src/zeref/adapters/read-adapters.ts` (and write if needed)
- `packages/jarvis-kernel/src/core/persona.ts` (steer: named competitor → BD tool; viral market → external trends; own 5× → outliers)

### Web BFF wiring
- `apps/web/lib/jarvis/zeref-context.ts`
- `apps/web/lib/jarvis/**` new helper e.g. `competitor-discovery.ts` / extend research helpers
- `apps/web/lib/ops/instagram-health.ts` **or** new `apps/web/lib/ops/facebook-health.ts` + route `apps/web/app/api/v1/ops/facebook-health/route.ts`
- `apps/web/test/**` unit tests (mocks)
- `apps/web/lib/jarvis/llm-port.ts` mock routing only if needed for CI mock path
- `apps/web/lib/jarvis/external-research.ts` — optional tighten: require platforms/regions; always include `reelIdeas[]` in response shape

## Forbidden

- Scraping Instagram/Facebook HTML / Playwright live scrape
- Committing tokens / `.env` / `.env.local`
- Removing or regressing Instagram Login Insights (`fetchMediaInsights` / `get_instagram_insights`)
- Meta **publish** / Content Publishing API / App Review packaging
- Next 16, auth product, vector memory (`TRACK-B-DEFER` — still BLOCKED; do not implement)
- Editing `eval/golden_set.jsonl` without human approval
- Claiming Business Discovery works on `graph.instagram.com`

## Implement exactly

### 1) Facebook Graph client (package)

Add e.g. `packages/instagram/src/graph/business-discovery.ts`:

- Host default: `https://graph.facebook.com` (versioned path OK, e.g. `v21.0`)
- `fetchCompetitorDiscovery({ accessToken, igBusinessId, username, mediaLimit? })`
- Field set (MVP):

```
business_discovery.username({username}){
  username,
  name,
  followers_count,
  media_count,
  biography,
  website,
  media.limit({n}){
    id, caption, media_type, media_url, permalink, timestamp, like_count, comments_count
  }
}
```

- Map to a typed DTO; throw soft/parse Meta errors with message slice (no token echo)
- Unit test with mock `fetch` + fixture JSON

### 2) Env

`.env.example`:

```env
# FACEBOOK_ACCESS_TOKEN=     # Facebook User token (Business Discovery) — graph.facebook.com
# FACEBOOK_IG_BUSINESS_ID=   # Your IG business account id (BD query root)
```

Do **not** overwrite Instagram Login vars.

### 3) Ops health

`GET /api/v1/ops/facebook-health` →  
`{ configured, reachable, igBusinessId?, sampleUsername?: "nasa"|null, error?, businessDiscovery?: boolean }`

- Missing token → `configured:false`, HTTP 200
- Present → light BD probe against a fixture public handle (or skip network if `ZEREF_BFF_FIXTURE=1`)
- CI: mock only

### 4) Jarvis tools (contracts + kernel + web)

Add tools:

| Name | Risk | Behavior |
|------|------|----------|
| `discover_competitor` | read | Args `{ username: string, mediaLimit?: number }`. Calls BD. If FB env missing → `{ available:false, message, hint: "set FACEBOOK_* — see LIVE_COMPETITOR_SETUP.md" }` |
| `suggest_reel_ideas` | write-low | Args `{ query: string, competitorUsernames?: string[], regions?: string[], limit?: number }`. If competitors provided and FB configured → BD fetch + rank by likes/comments; merge with web-intel hooks from `research_external_trends` / OpenRouter. Always label sources: `graph-business-discovery` vs `web-intel`. Return `{ ideas:[{ title, hook, format, why, inspiredBy? }], sources, limitations }` |

Persona rules (mandatory):

- Named `@handle` / “competitor” → `discover_competitor` (not own outliers)
- “Viral trends / what Reels should I make” without handles → `suggest_reel_ideas` or `research_external_trends`
- Never tell the operator Insights are impossible if `get_instagram_insights` works
- Never claim BD works without `FACEBOOK_*`

### 5) Research hub honesty (minimal)

If an existing research competitor fixture path exists (`competitor_graph` signal), keep fixture behavior under `ZEREF_BFF_FIXTURE=1`. Live mode may attach BD summary into research intel **only** if a clean existing extension point exists — do **not** redesign Phase 9 schemas unless required; prefer Jarvis tool results first.

## Acceptance

- [ ] `docs/LIVE_COMPETITOR_SETUP.md` complete (Page link, FB Login, scopes, curl, env, college vs live)
- [ ] `.env.example` documents `FACEBOOK_ACCESS_TOKEN` + `FACEBOOK_IG_BUSINESS_ID`
- [ ] `@zeref/instagram` exports Business Discovery fetch + unit tests green (mock)
- [ ] `GET /api/v1/ops/facebook-health` soft-fail contract + unit test missing-token
- [ ] `discover_competitor` + `suggest_reel_ideas` in `JarvisToolNameSchema`, descriptors, executor, `zeref-context`
- [ ] Persona steers competitor/viral asks away from empty own-account outliers
- [ ] Instagram Login Insights path still green (no regressions)
- [ ] AGENT_LOG append + PR; Planner merges and sets QUEUE DONE

## Out of scope (explicit)

- TikTok/YouTube official APIs
- Hashtag Search App Review packaging
- Scraping / unlabeled fixture-as-live competitor data
- Auto-following or messaging competitors

## Grok claim steps

1. Branch `cloud/b3-<short>`
2. QUEUE → `IN_PROGRESS` + AGENT_LOG start
3. Implement allowed paths only
4. PR → `PR_READY` + URL in AGENT_LOG
5. Do **not** mark DONE
