# Live competitor Business Discovery setup (laptop)

Enable Jarvis **named competitor** research via Meta **Business Discovery** on **`https://graph.facebook.com`**. This is a **second token and second host** — keep Instagram Login Insights on **`https://graph.instagram.com`**. Do **not** remove the Instagram Login product.

Zeref does **not** scrape Instagram/Facebook HTML, does **not** publish, and does **not** claim Business Discovery on Instagram Login. **Never commit tokens.**

Live UAT is **human / laptop after merge**. CI and Cloud Agents stay mock/fixture-safe (`ZEREF_BFF_FIXTURE=1`).

---

## Two tokens, two hosts

| Capability | Host | Env |
|------------|------|-----|
| Own media + Insights | `graph.instagram.com` | `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_GRAPH_USER_ID` — [LIVE_INSTAGRAM_SETUP.md](./LIVE_INSTAGRAM_SETUP.md) |
| Competitor Business Discovery | `graph.facebook.com` | **`FACEBOOK_ACCESS_TOKEN`** + **`FACEBOOK_IG_BUSINESS_ID`** (this doc) |
| City viral audio charts | — | **Not a Meta Graph product** — Jarvis `research_external_trends` / `suggest_reel_ideas` (web-intel) |

A probe of `business_discovery` on Instagram Login returns *Tried accessing nonexisting field*. Do not chase BD on `graph.instagram.com`.

---

## What you will end with

| Env var | Meaning |
|---------|---------|
| `FACEBOOK_ACCESS_TOKEN` | Long-lived **Facebook User** token (Facebook Login for Business) |
| `FACEBOOK_IG_BUSINESS_ID` | **Your** IG professional account id on Facebook Graph (Page → `instagram_business_account`). This is the **querying** id for Business Discovery, **not** the competitor’s id. |

Put both in **root** `.env` **and** `apps/web/.env.local`. Both files are gitignored. Do **not** overwrite Instagram Login vars.

---

## 1. Instagram Professional + Facebook Page

1. Use an Instagram **Professional** account (Business or Creator).
2. Link it to a **Facebook Page** you can manage (Meta Business Suite / Page settings → Instagram).
3. The Page-linked IG id is the Business Discovery **query root**.

---

## 2. Same Meta app: add Facebook Login for Business

1. Open the **same** Meta app already used for Instagram Login.
2. Add product **Facebook Login for Business**.
3. **Keep** Instagram API with Instagram Login — do not remove it.
4. App roles: you can manage the Page; add IG tester/admin as Meta requires in Development mode.

---

## 3. Permissions (request at login / Graph Explorer)

| Permission | Why |
|------------|-----|
| `instagram_basic` | Read the Page-linked IG professional account |
| `pages_read_engagement` | Page linkage / engagement fields Meta requires for this path |
| `instagram_manage_insights` | Competitor media metric fields **when Meta allows them on BD** (optional for the MVP field set) |
| `ads_read` **or** `ads_management` | Required **if** the Page role is via Business Manager (Meta requirement) |

Development mode + tester/admin does **not** need App Review for your own Page-linked account. Do not add publish / Content Publishing scopes for this setup.

---

## 4. Resolve your querying IG business id

On **Facebook Graph** (not Instagram Login `/me`):

```bash
# Pages you manage
curl -sS "https://graph.facebook.com/v21.0/me/accounts?access_token=FACEBOOK_ACCESS_TOKEN"

# For the Page that is linked to Instagram:
curl -sS "https://graph.facebook.com/v21.0/PAGE_ID?fields=instagram_business_account&access_token=FACEBOOK_ACCESS_TOKEN"
```

Copy `instagram_business_account.id` → **`FACEBOOK_IG_BUSINESS_ID`**.

This id is **yours**. Competitor lookups pass a **username** in `business_discovery.username(...)`.

---

## 5. Long-lived Facebook User token

Exchange the short-lived Facebook User token for a long-lived token using current Meta docs (`fb_exchange_token` on `graph.facebook.com`). Store the result as `FACEBOOK_ACCESS_TOKEN`. Re-issue after adding scopes. Never commit the value.

---

## 6. Curl must succeed before live UAT

Replace `nasa` with any public Instagram **Business/Creator** username:

```bash
curl -sS "https://graph.facebook.com/v21.0/FACEBOOK_IG_BUSINESS_ID?fields=business_discovery.username(nasa){username,followers_count,media_count}&access_token=FACEBOOK_ACCESS_TOKEN"
```

MVP media field set used by Zeref (`packages/instagram/src/graph/business-discovery.ts`):

```text
business_discovery.username({username}){
  username,name,followers_count,media_count,biography,website,
  media.limit({n}){id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count}
}
```

Example (limit 2):

```bash
curl -sS "https://graph.facebook.com/v21.0/FACEBOOK_IG_BUSINESS_ID?fields=business_discovery.username(nasa){username,name,followers_count,media_count,biography,website,media.limit(2){id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count}}&access_token=FACEBOOK_ACCESS_TOKEN"
```

Success includes a `business_discovery` object with `username` and optional `media.data`. Failures are usually: wrong host (Instagram Login), missing Page link, Development testers, or scopes not on the token.

---

## 7. Put env vars in both places

**Root** `.env`:

```env
FACEBOOK_ACCESS_TOKEN=YOUR_LONG_LIVED_FACEBOOK_USER_TOKEN
FACEBOOK_IG_BUSINESS_ID=YOUR_IG_BUSINESS_ACCOUNT_ID
```

**And** `apps/web/.env.local` (same two names). Keep existing `INSTAGRAM_*` lines unchanged.

- Never commit `.env`, `.env.local`, or paste tokens into PRs / AGENT_LOG / chat.
- Do not set `FACEBOOK_*` as Cloud Agent Runtime Secrets unless you intentionally want live BD in cloud (college path should stay fixture-only).

---

## 8. College mode vs live mode

### College / fixture (default demo)

```powershell
.\scripts\demo-start.ps1
```

`ZEREF_BFF_FIXTURE=1` stays on. Jarvis tools must **not** claim live Business Discovery. Missing `FACEBOOK_*` → `discover_competitor` returns `available:false` with a hint to this doc. Ops probe:

```text
GET http://localhost:3000/api/v1/ops/facebook-health
```

Expect `{ "configured": false, "reachable": false, "businessDiscovery": false }` when tokens are absent (HTTP 200). Instagram Insights stay on `GET /api/v1/ops/instagram-health`.

### Live Business Discovery (operator laptop)

1. Fixture **OFF** — do **not** set `ZEREF_BFF_FIXTURE=1`.
2. `FACEBOOK_ACCESS_TOKEN` + `FACEBOOK_IG_BUSINESS_ID` in root `.env` and `apps/web/.env.local`.
3. Keep `INSTAGRAM_*` for own Insights (`graph.instagram.com`).
4. Restart the live stack (`.\scripts\live-data-start.ps1` or `npm run dev:stack`).
5. Probe:

```text
GET http://localhost:3000/api/v1/ops/facebook-health
```

Expect `configured:true`. When the light `nasa` BD probe succeeds: `reachable:true`, `businessDiscovery:true` (boolean).

Then run the UAT script in §10.

Jarvis:

- Named `@handle` / “competitor” → `discover_competitor`
- “Viral trends / what Reels should I make” without handles → `suggest_reel_ideas` or `research_external_trends` (web-intel — not empty own-account 5× outliers)
- Own Insights → `get_instagram_insights` (still works; do not say Insights are impossible)

---

## 9. Safety checklist

- [ ] Page-linked Instagram Professional account
- [ ] Facebook Login for Business **added**; Instagram Login **kept**
- [ ] Facebook User token scopes as in §3
- [ ] `FACEBOOK_IG_BUSINESS_ID` is **your** querying id
- [ ] Curl on **`graph.facebook.com`** succeeds
- [ ] `node scripts/uat-competitor.mjs --username nasa` (or `.\scripts\live-competitor-check.ps1`) after curl — laptop only
- [ ] Vars in **both** root `.env` and `apps/web/.env.local`
- [ ] Tokens never committed
- [ ] College demo still uses `demo-start.ps1` + fixture ON
- [ ] No claim of BD on `graph.instagram.com`
- [ ] No scrape / Meta publish / App Review packaging

---

## 10. UAT script (CLOUD-B4)

Laptop-only after curl in §6 succeeds. **DATABASE_URL is not required.** CI / Cloud Agents stay mock-safe (missing `FACEBOOK_*` is a soft-fail, not a live Graph claim).

```powershell
node scripts/uat-competitor.mjs --username nasa
# Windows helper (loads FACEBOOK_* from .env / .env.local without printing values):
.\scripts\live-competitor-check.ps1 -Username nasa
```

| Result | Meaning |
|--------|---------|
| `available:false` + hint | `FACEBOOK_*` missing — set vars per this doc; exit 0 (soft-fail) |
| Redacted summary (`followersCount`, `mediaCount`, `topLikes`) | Live BD returned a profile. Token is never printed |
| Graph error JSON (`error` redacted) | Tokens present but Meta rejected the probe — fix scopes/Page link; do not paste tokens |

Do **not** mark live UAT done until a human records curl success from §6.

---

## Related

- Client: `packages/instagram/src/graph/business-discovery.ts` (`DEFAULT_FACEBOOK_GRAPH_BASE = https://graph.facebook.com/v21.0`)
- Instagram Login (own Insights): [LIVE_INSTAGRAM_SETUP.md](./LIVE_INSTAGRAM_SETUP.md)
- Env comments: root `.env.example` (`FACEBOOK_*`)
- Ops probe: `GET /api/v1/ops/facebook-health` (`businessDiscovery: true` when the live probe succeeds)
- Laptop UAT: `scripts/uat-competitor.mjs` · `scripts/live-competitor-check.ps1`
- Queue: [cloud/QUEUE.md](./cloud/QUEUE.md) · [cloud/phases/B4-competitor-uat.md](./cloud/phases/B4-competitor-uat.md)
