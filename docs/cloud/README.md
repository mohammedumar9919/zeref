# Cloud track — Grok Bot / Cursor Cloud Agents

**This folder is the remote agents' home base.** Everything here is on GitHub so phone agents can read it without the laptop.

| File | Purpose |
|------|---------|
| [MASTERPLAN.md](./MASTERPLAN.md) | College Track A + partner Track B (cloud copy) |
| [QUEUE.md](./QUEUE.md) | Ordered remote-ready work — **pick top OPEN item only** |
| [HANDOFF.md](./HANDOFF.md) | PR rules, AGENT_LOG, how the laptop Planner reviews your work |
| [AGENT_LOG.md](./AGENT_LOG.md) | Append-only work log (you write; Planner reads later) |
| [PLANNER.md](./PLANNER.md) | Run a **Planner** Cloud Agent / Grok Bot from work (review/merge, not implement) |
| [phases/](./phases/) | One card per remote-capable slice |

**Secrets:** Confirmed OK when dashboard has all 10 fixture Runtime Secrets on `mohammedumar9919/zeref` (see [../REMOTE_AGENTS.md](../REMOTE_AGENTS.md)). `ZEREF_BFF_FIXTURE=1` is already in that set.

**Skills:** In-repo `.cursor/skills/**` always load. On laptop enable **Settings → Agents → Sync Skills for Cloud Agents**. Full Planner prompt: [PLANNER.md](./PLANNER.md).

**Fixture demo (CLOUD-A0):** Windows `.\scripts\demo-start.ps1` (no Docker). Cloud: Secrets already set — `npm run dev -w @zeref/web`. Studio entity id `550e8400-e29b-41d4-a716-446655440001` — [../CURRENT_STATE.md](../CURRENT_STATE.md) · [../../fixtures/README.md](../../fixtures/README.md).

---

## Boot (every Grok Bot / Cloud session)

1. Read [../CURRENT_STATE.md](../CURRENT_STATE.md)
2. Read this folder: **MASTERPLAN → QUEUE → your phase card → HANDOFF**
3. Read [../failures-checklist.md](../failures-checklist.md)
4. Do **exactly one** OPEN item from QUEUE
5. Open a PR + append to AGENT_LOG.md on the same branch
6. Stop. Do not start the next phase until Planner marks QUEUE done.

---

## Hard rules

- Fixture mode only unless Secrets include live keys (default: mocks ON)
- Branch name: `cloud/<phase-id>-short-slug` (e.g. `cloud/p62-workspace-hud`)
- Never force-push `main`; never commit `.env` / tokens
- Do not edit Planner files under the user's local `.cursor/plans/`
- Laptop-only: Docker Postgres reset, mic/PTT UAT, Luke screenshot sign-off, college video recording
