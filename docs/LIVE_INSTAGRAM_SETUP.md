# Live Instagram Graph setup (laptop)

Produce **`INSTAGRAM_ACCESS_TOKEN`** + **`INSTAGRAM_GRAPH_USER_ID`** for Zeref’s collect path. The client talks to **`https://graph.instagram.com`** only (see `packages/instagram/src/graph/client.ts`) — **Instagram API with Instagram Login**, not the older Facebook Page / `graph.facebook.com` IG Business path.

This doc is **read + collect** setup. Zeref does **not** claim Meta publish, App Review, or unlabeled fixture-as-live. **Never commit tokens.**

---

## What you will end with

| Env var | Meaning |
|---------|---------|
| `INSTAGRAM_ACCESS_TOKEN` | Long-lived user access token for Graph calls |
| `INSTAGRAM_GRAPH_USER_ID` | Instagram user id from `GET /me` (same id used as `/{id}/media`) |

Put both in **root** `.env` **and** `apps/web/.env.local` (Next loads server secrets from `.env.local`; worker/stack also reads root `.env`). Both files are gitignored.

---

## 1. Instagram Professional account

1. Use (or convert to) an Instagram **Professional** account — **Business** or **Creator**.
2. Personal (consumer) accounts cannot use this API product.
3. You will authorize this account against your Meta app in Development mode (tester role below).

---

## 2. Meta Developer app (Business type)

1. Open [Meta for Developers](https://developers.facebook.com/) → **My Apps** → **Create App**.
2. Choose a **Business** app type (not a consumer-only toy app).
3. Note the app’s **App ID** / **App Secret** (secret stays in Meta dashboard — do not put App Secret in Zeref `.env` for this collect path; Zeref only needs the user access token + Graph user id).

---

## 3. Add Instagram API with Instagram Login

1. In the app dashboard, add the product: **Instagram API with Instagram Login**.
2. Complete the product’s basic setup (redirect URI / login config as the dashboard requires for token generation).
3. Confirm the Graph host you will call is **`https://graph.instagram.com`** (matches Zeref’s `DEFAULT_GRAPH_BASE`).

Do **not** follow older guides that only describe Facebook Login + Page-linked IG Business accounts on `graph.facebook.com` unless you are deliberately on that legacy path — Zeref’s packaged client does not.

---

## 4. Development mode + Instagram Tester

While the app is in **Development** mode:

1. Add your Instagram Professional account as an **Instagram Tester** (App roles / Instagram testers — follow the product UI).
2. Accept the tester invite from the Instagram account (Instagram app / notifications as Meta documents).
3. Only tester (and admin) accounts can obtain working tokens and call Graph until App Review / Live — Zeref Track B does **not** require App Review for local collect.

---

## 5. Permissions

Request / grant at least:

| Permission | Role for Zeref |
|------------|----------------|
| **`instagram_business_basic`** | **Primary** — profile + media read used by collect (`/me`, `/{id}/media`) |
| **`instagram_business_manage_insights`** | **Insights** — account + media metrics (`/{id}/insights`, `/{media-id}/insights`) used by Jarvis snapshot/insights tools |

Grant both in the Meta app, add your IG account as tester, then **re-issue / re-exchange the user token** after enabling Insights so the new scope is on the token. Development mode + tester does **not** need App Review for your own account.

### What this path can and cannot do

| Capability | Instagram Login (`graph.instagram.com`) |
|------------|-----------------------------------------|
| Own media list + likes/comments | Yes (`instagram_business_basic`) |
| Own Insights (views, reach, saves, profile visits) | Yes (`instagram_business_manage_insights`) |
| Competitor Business Discovery | **No** — field not on Instagram Login. Use Facebook Login + `graph.facebook.com` — [LIVE_COMPETITOR_SETUP.md](./LIVE_COMPETITOR_SETUP.md) |
| Facebook Page Insights | **No** — needs Facebook Page token / Facebook Login product |

Do not chase publish scopes for this setup.

---

## 6. Get a user access token

Use Meta’s Instagram Login / token tools in the app dashboard (or the OAuth flow the product documents) until you have a **short-lived** user access token for the tester IG account.

### Long-lived token (required for anything beyond a quick curl)

Short-lived tokens expire in ~1 hour. Exchange for a **long-lived** token (Meta docs: typically ~60 days) before putting values in `.env`.

Example exchange shape (confirm query params against current Meta docs for Instagram Login):

```bash
curl -sS "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=YOUR_APP_SECRET&access_token=SHORT_LIVED_TOKEN"
```

Store the returned long-lived `access_token` as `INSTAGRAM_ACCESS_TOKEN`. Re-exchange / refresh before expiry; never commit the value.

---

## 7. Curl checks (must match Zeref field sets)

Replace `TOKEN` with your long-lived token. Base URL: **`https://graph.instagram.com`**.

### `GET /me` — id + username

```bash
curl -sS "https://graph.instagram.com/me?fields=id,username&access_token=TOKEN"
```

Example success shape:

```json
{ "id": "17841…", "username": "your_handle" }
```

Copy `id` → **`INSTAGRAM_GRAPH_USER_ID`**.

Zeref’s client uses the same fields when resolving the user (`me?fields=id,username`, then `/{userId}?fields=id,username`).

### `GET /{id}/media` — MVP media fields

Use the **same** `id` as `INSTAGRAM_GRAPH_USER_ID`. Fields must match `MEDIA_FIELDS` in `packages/instagram/src/graph/client.ts`:

`id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count`

```bash
curl -sS "https://graph.instagram.com/INSTAGRAM_GRAPH_USER_ID/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=12&access_token=TOKEN"
```

You should see a `data` array of media objects. If this fails with permission / tester errors, fix Meta setup before starting live stack.

Optional single media (same field set):

```bash
curl -sS "https://graph.instagram.com/MEDIA_ID?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&access_token=TOKEN"
```

---

## 8. Put env vars in both places

**Root** `.env` (copy from `.env.example` if needed):

```env
INSTAGRAM_ACCESS_TOKEN=YOUR_LONG_LIVED_TOKEN
INSTAGRAM_GRAPH_USER_ID=YOUR_IG_USER_ID
```

**And** `apps/web/.env.local`:

```env
INSTAGRAM_ACCESS_TOKEN=YOUR_LONG_LIVED_TOKEN
INSTAGRAM_GRAPH_USER_ID=YOUR_IG_USER_ID
```

- Never commit `.env`, `.env.local`, or paste tokens into PRs / AGENT_LOG / chat logs.
- Do not set tokens as Cloud Agent Runtime Secrets unless you intentionally want live Graph in cloud (college path should stay fixture-only).

---

## 9. College mode vs live mode

### College / fixture (default demo)

Keep fixture mocks. **Do not** rely on live Graph for the talk.

```powershell
.\scripts\demo-start.ps1
```

That path keeps **`ZEREF_BFF_FIXTURE=1`** (and related mocks). Badges that say Fixture / SIMULATED are correct. Live Instagram publish is **not** built and must not be claimed.

### Live Graph collect (operator laptop)

1. Fixture **OFF** — do **not** set `ZEREF_BFF_FIXTURE=1`.
2. Postgres up with a real `DATABASE_URL` (Docker compose / local Postgres as you already use for `dev:stack`).
3. `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_GRAPH_USER_ID` present in root `.env` and `apps/web/.env.local`.
4. Start with the live-data operator script (CLOUD-B1):

```powershell
.\scripts\live-data-start.ps1
```

That script starts the live stack **without** enabling BFF fixture (`npm run dev:stack` + `ZEREF_WORKER_AVAILABLE=1`). After ready, probe token presence/reachability:

```text
GET http://localhost:3000/api/v1/ops/instagram-health
```

Live voice ([LIVE_VOICE_SETUP.md](./LIVE_VOICE_SETUP.md)) can stay fixture-backed for cockpit data; live Graph is a separate mode — do not mix unlabeled fixture metrics with “live” claims.

### Bulk recent collect (CLOUD-B5 — refresh cockpit)

When Graph shows many posts but Studio only has one stale entity, pull the newest unseen media into the pipeline:

```powershell
# default --limit 5
.\scripts\live-collect-recent.ps1
.\scripts\live-collect-recent.ps1 -Limit 8
# or
node scripts/uat-collect-recent.mjs --limit 5
```

Requires live `INSTAGRAM_*` + `DATABASE_URL`. Skips media ids already present in `snapshots`. Never prints tokens. Phase card: [cloud/phases/B5-pipeline-freshness.md](./cloud/phases/B5-pipeline-freshness.md).

---

## 10. Safety checklist

- [ ] Professional IG account + Business Meta app
- [ ] Instagram API **with Instagram Login** → `graph.instagram.com`
- [ ] Instagram Tester accepted in Development mode
- [ ] `instagram_business_basic` granted
- [ ] Long-lived token + curl `/me` and `/{id}/media` succeed
- [ ] Vars in **both** root `.env` and `apps/web/.env.local`
- [ ] Tokens never committed
- [ ] College demo still uses `demo-start.ps1` + fixture ON
- [ ] No claim of Meta **publish** / App Review / live unlabeled metrics

---

## Related

- Client: `packages/instagram/src/graph/client.ts` (`DEFAULT_GRAPH_BASE = https://graph.instagram.com`)
- Env comments: root `.env.example` (Instagram section)
- Queue / Track B: [cloud/QUEUE.md](./cloud/QUEUE.md) · [cloud/phases/B0-meta-graph-prep.md](./cloud/phases/B0-meta-graph-prep.md)
- Live operator start (B1): `scripts/live-data-start.ps1`
- Ops probe: `GET /api/v1/ops/instagram-health` (`configured` / `reachable`)
- Competitor Business Discovery (separate Facebook User token): [LIVE_COMPETITOR_SETUP.md](./LIVE_COMPETITOR_SETUP.md)
