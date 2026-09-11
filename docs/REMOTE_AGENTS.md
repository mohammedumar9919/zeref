# Remote agents — Cloud Agents & Grok Bot

Use this when working from a **phone** or any machine that is **not** the laptop with Docker.

**Repo:** `https://github.com/mohammedumar9919/zeref`  
**Runtime truth:** [CURRENT_STATE.md](./CURRENT_STATE.md)  
**Track A (college flash):** Phase 6.2 → product surfaces → research-lite → streaming-lite → submission pack  
**Do not start Track B** (Next 16, publish/App Review, multi-tenant auth, vector memory) until college freeze.

---

## What remote agents can / cannot do

| Can (preferred) | Cannot / avoid |
|-----------------|----------------|
| Edit code on a branch + open a **PR** | Rely on laptop Docker / local Postgres volume |
| Fixture-mode tests (`ZEREF_BFF_FIXTURE=1`) | Commit `.env`, tokens, or keys |
| Phase **6.2** UI, Reports/Studio polish, Research cards | Scrape personal Instagram / unofficial APIs |
| Docs + contracts + verify scripts | Force-push `main` |
| Read `docs/governance/phase-6.2-contract.md` | Mid-demo Next.js 16 upgrade |

Voice PTT, Luke visual sign-off screenshots, and `dev:stack` remain **laptop UAT**.

---

## Boot sequence (every remote session)

1. Read [CURRENT_STATE.md](./CURRENT_STATE.md)
2. Read [failures-checklist.md](./failures-checklist.md)
3. Read [AGENTS.md](../AGENTS.md) — ownership + Cloud section
4. Relevant `docs/governance/phase-*-contract.md`
5. One slice only → branch → PR

---

## Required Cloud Secrets (dashboard — never git)

Add at [cursor.com/dashboard](https://cursor.com/dashboard) → **Cloud Agents → Secrets** (or environment-scoped secrets).

### Safe default (fixture / offline)

| Name | Value |
|------|--------|
| `ZEREF_BFF_FIXTURE` | `1` |
| `ZEREF_LLM_MOCK` | `1` |
| `ZEREF_TTS_MOCK` | `1` |
| `ZEREF_WHISPER_MOCK` | `1` |
| `ZEREF_JOB_ENQUEUE_MOCK` | `1` |
| `ZEREF_MEMORY_MOCK` | `1` |
| `ZEREF_PHASE8_PRODUCT` | `1` |
| `ZEREF_PHASE9_RESEARCH` | `1` |
| `ZEREF_PHASE11_AGENT` | `1` |
| `ZEREF_PHASE12_DATA` | `1` |

### Optional live voice (only if you want real LLM/TTS in cloud)

| Name | Notes |
|------|--------|
| `OPENROUTER_API_KEY` | Server-side only |
| `OPENROUTER_MODEL` | e.g. `openai/gpt-4o-mini` or stronger planner |
| `ELEVENLABS_API_KEY` | British JARVIS TTS |
| `ELEVENLABS_VOICE_ID` | Your voice id |

Unset the matching `*_MOCK` flags when using live keys. **Never paste keys into chat prompts.**

### Do not put in Cloud Secrets unless you have a cloud DB

- `DATABASE_URL` pointing at laptop `localhost`
- `INSTAGRAM_ACCESS_TOKEN` for casual UI tasks (keep laptop-only until publish track)

---

## Environment config (repo)

- [`.cursor/environment.json`](../.cursor/environment.json) — Cloud Build install (`npm ci`)
- [`.cursor/Dockerfile`](../.cursor/Dockerfile) — Node 22 base

After first push of these files: open [cursor.com/agents](https://cursor.com/agents) → ensure GitHub repo `mohammedumar9919/zeref` is connected → run a **Build** / agent-led environment setup once so installs are cached.

---

## Copy-paste prompts

### Grok Bot / Cloud Agent — Phase 6.2 (next flash slice)

```
You are a Zeref UI worker (remote / Cloud).

Read docs/CURRENT_STATE.md and docs/REMOTE_AGENTS.md first.
Implement Phase 6.2 Visual Tier 3 per docs/governance/phase-6.2-contract.md (C99–C110).

Allowed: apps/web/components/hud/**, apps/web/components/shell/TopNav.tsx,
apps/web/components/cockpit/CockpitShell.tsx, CockpitGrid.tsx,
apps/web/components/globe/GlobeHero.tsx (wrapper/CSS only — no WebGL mesh rewrite),
apps/web/app/cockpit/**/page.tsx (layout classNames only),
apps/web/app/globals.css, apps/web/tailwind.config.ts,
scripts/verify-phase-6.2.mjs (if missing), apps/web/e2e/cockpit-workspace-6.2.spec.ts

Forbidden: apps/web/lib/**, apps/web/app/api/**, packages/**, apps/worker/**, .env*

Rules: one PR; no force-push; keep cyan/void HUD (no purple AI gradient, no green CTA swap);
prefers-reduced-motion on pulse; ZEREF_BFF_FIXTURE=1 for any smoke.

Done when: workspace routes hide grid; unified header; hero globe ≥58vh; pulse rings;
PR description lists files + how to screenshot for Planner sign-off.
```

### Smoke / orientation (first remote check)

```
Repo: mohammedumar9919/zeref.
Read docs/CURRENT_STATE.md and docs/REMOTE_AGENTS.md.
Confirm Node 22 + npm ci works. Do not change product code.
Reply with: phase status summary (0–12), next Track A slice, and any missing secrets.
```

---

## Phone checklist (you)

1. Cursor account = same as Grok Bot (done)
2. Dashboard → Integrations → **GitHub** connected with write access to `zeref`
3. Add **fixture secrets** from the table above
4. Start agent from [cursor.com/agents](https://cursor.com/agents) or Grok Bot with a **one-slice** prompt
5. Review PR on phone; merge when ready (prefer laptop for visual UAT)
