# Remote agents — Cloud Agents & Grok Bot

**Start here for phone work:** [cloud/README.md](./cloud/README.md)  
Then: [cloud/QUEUE.md](./cloud/QUEUE.md) → one phase card → [cloud/HANDOFF.md](./cloud/HANDOFF.md).

**Repo:** `https://github.com/mohammedumar9919/zeref`  
**Runtime truth:** [CURRENT_STATE.md](./CURRENT_STATE.md)  
**Masterplan (cloud copy):** [cloud/MASTERPLAN.md](./cloud/MASTERPLAN.md)

---

## Skills (Cloud Agents + Grok Bot)

**In-repo (always available after clone):** `.cursor/skills/**` (council-*, gsd-*, ui-ux-pro-max, run-verify-gate), `.cursor/rules/**`, [SKILL_INVOCATION.md](./SKILL_INVOCATION.md).

**Personal skills:** On the **laptop**, open Cursor → **Settings → Agents → Sync Skills for Cloud Agents → ON**. Only `~/.cursor/skills/` syncs. Then restart/new Cloud Agent.

**Planner full prompt:** [cloud/PLANNER.md](./cloud/PLANNER.md)

**Playbook:** Follow [SKILL_INVOCATION.md](./SKILL_INVOCATION.md). For HUD work use `ui-ux-pro-max`. For PR review use `council-review-slice`.

---

## Secrets status

Dashboard **My Secrets** for `mohammedumar9919/zeref` should include these 10 Runtime Secrets (all = `1`):

`ZEREF_BFF_FIXTURE`, `ZEREF_JOB_ENQUEUE_MOCK`, `ZEREF_LLM_MOCK`, `ZEREF_MEMORY_MOCK`, `ZEREF_PHASE8_PRODUCT`, `ZEREF_PHASE9_RESEARCH`, `ZEREF_PHASE11_AGENT`, `ZEREF_PHASE12_DATA`, `ZEREF_TTS_MOCK`, `ZEREF_WHISPER_MOCK`

That set is **complete** for fixture Track A work. Optional later: `OPENROUTER_*` / `ELEVENLABS_*` (unset matching mocks).

Do **not** add laptop `DATABASE_URL=localhost` or Instagram tokens for casual UI slices.

---

## Fixture demo (CLOUD-A0)

**Windows laptop — one command, no Docker:**

```powershell
.\scripts\demo-start.ps1
```

The script sets `ZEREF_BFF_FIXTURE=1` plus the other fixture/mock flags and starts `npm run dev -w @zeref/web`.

**Cloud Agents:** those flags are already Runtime Secrets (`ZEREF_BFF_FIXTURE=1` included). Do **not** run `demo-start.ps1` unless you need the printed URLs. Start with `npm run dev -w @zeref/web`. Never commit `.env` / tokens. Never wipe Docker volumes from a cloud session.

**Fixture studio entity id** (only id that resolves in fixture mode):

`550e8400-e29b-41d4-a716-446655440001`

- Cockpit: `/cockpit`
- Studio editor: `/cockpit/studio/550e8400-e29b-41d4-a716-446655440001`
- Calendar: `/cockpit/calendar`

Details: [CURRENT_STATE.md](./CURRENT_STATE.md) · [fixtures/README.md](../fixtures/README.md) · [cloud/phases/A0-demo-ops.md](./cloud/phases/A0-demo-ops.md)

---

## Environment

- [`.cursor/environment.json`](../.cursor/environment.json) — `npm ci` on Node 22
- [`.cursor/Dockerfile`](../.cursor/Dockerfile)

---

## First prompt for Grok Bot (after cloud docs are on main)

```
You are Zeref Cloud worker.
Read docs/cloud/README.md, docs/cloud/QUEUE.md, docs/cloud/MASTERPLAN.md, docs/CURRENT_STATE.md.
Track B is ACTIVE. First OPEN is CLOUD-B3 (not TRACK-B-DEFER).
Confirm secrets are fixture mode for CI. Do not code yet.
Reply with: top OPEN queue item, why, and the exact phase card path you will use next.
```

When ready to build:

```
Claim the first OPEN item in docs/cloud/QUEUE.md (CLOUD-B3).
Follow docs/cloud/phases/B3-competitor-discovery.md exactly.
Follow docs/cloud/HANDOFF.md (branch + PR template + AGENT_LOG append).
QUEUE wins over any old AGENT_LOG “do not start TRACK-B” lines.
One slice only. Stop when PR is ready.
```

---

## How the laptop Planner reads your work later

1. GitHub PRs with prefix `cloud/`
2. [cloud/AGENT_LOG.md](./cloud/AGENT_LOG.md)
3. QUEUE status transitions
4. Local UAT for visual/voice, then merge + CURRENT_STATE update
