# INTEGRATIONS — Zeref

---

## External APIs

| Service | Used in | Env var | CI mode |
|---------|---------|---------|---------|
| Instagram (scrape/Graph) | `@zeref/instagram`, collect job | `ZEREF_LIVE_INSTAGRAM` | Fixtures only |
| OpenRouter (LLM) | analyze/report narrative | `OPENROUTER_API_KEY` | `ZEREF_LLM_MOCK=1` |
| Embedding provider | embed job | `ZEREF_EMBED_PROVIDER`, `OPENAI_API_KEY`, `ZEREF_NOMIC_EMBED_URL` | Mock/local |
| ElevenLabs TTS | Phase 6 planned | TBD | `ZEREF_TTS_MOCK=1` planned |

---

## Internal integration points

| From | To | Mechanism |
|------|-----|-----------|
| `apps/web` RSC | BFF routes | `fetch` localhost / `ZEREF_BFF_URL` |
| BFF | Postgres | `@zeref/db` Drizzle |
| CLI enqueue scripts | pg-boss | `scripts/enqueue-*.mjs` |
| Worker handlers | Postgres | `@zeref/db`, packages |
| Worker auto-chain | inline calls | normalize→embed, analyze→report |

**Gap:** No worker daemon script; no SSE event bus; no HTTP job enqueue.

---

## Cursor / agent tooling

| Tool | Integration |
|------|-------------|
| GSD Redux | `.cursor/get-shit-done/`, phase workflows |
| Superpowers | Cursor plugin (user install) |
| UI UX Pro Max | `.cursor/skills/ui-ux-pro-max/` |
| Council skills | `.cursor/skills/council-*` |

---

## Reference repos (read-only)

- `c:\Projects\instagram-ops-studio` — legacy patterns
- Luke jarvis-orb — HUD + event mapping reference
