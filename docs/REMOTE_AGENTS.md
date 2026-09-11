# Remote agents — Cloud Agents & Grok Bot

**Start here for phone work:** [cloud/README.md](./cloud/README.md)  
Then: [cloud/QUEUE.md](./cloud/QUEUE.md) → one phase card → [cloud/HANDOFF.md](./cloud/HANDOFF.md).

**Repo:** `https://github.com/mohammedumar9919/zeref`  
**Runtime truth:** [CURRENT_STATE.md](./CURRENT_STATE.md)  
**Masterplan (cloud copy):** [cloud/MASTERPLAN.md](./cloud/MASTERPLAN.md)

---

## Secrets status

Dashboard **My Secrets** for `mohammedumar9919/zeref` should include these 10 Runtime Secrets (all = `1`):

`ZEREF_BFF_FIXTURE`, `ZEREF_JOB_ENQUEUE_MOCK`, `ZEREF_LLM_MOCK`, `ZEREF_MEMORY_MOCK`, `ZEREF_PHASE8_PRODUCT`, `ZEREF_PHASE9_RESEARCH`, `ZEREF_PHASE11_AGENT`, `ZEREF_PHASE12_DATA`, `ZEREF_TTS_MOCK`, `ZEREF_WHISPER_MOCK`

That set is **complete** for fixture Track A work. Optional later: `OPENROUTER_*` / `ELEVENLABS_*` (unset matching mocks).

Do **not** add laptop `DATABASE_URL=localhost` or Instagram tokens for casual UI slices.

---

## Environment

- [`.cursor/environment.json`](../.cursor/environment.json) — `npm ci` on Node 22
- [`.cursor/Dockerfile`](../.cursor/Dockerfile)

---

## First prompt for Grok Bot (after cloud docs are on main)

```
You are Zeref Cloud worker.
Read docs/cloud/README.md, docs/cloud/QUEUE.md, docs/cloud/MASTERPLAN.md, docs/CURRENT_STATE.md.
Confirm secrets are fixture mode. Do not code yet.
Reply with: top OPEN queue item, why, and the exact phase card path you will use next.
```

When ready to build:

```
Claim the first OPEN item in docs/cloud/QUEUE.md.
Follow docs/cloud/HANDOFF.md (branch + PR template + AGENT_LOG append).
One slice only. Stop when PR is ready.
```

---

## How the laptop Planner reads your work later

1. GitHub PRs with prefix `cloud/`
2. [cloud/AGENT_LOG.md](./cloud/AGENT_LOG.md)
3. QUEUE status transitions
4. Local UAT for visual/voice, then merge + CURRENT_STATE update
