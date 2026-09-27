# Cloud track — Grok Bot / Cursor Cloud Agents

**This folder is the remote agents' home base.** Everything here is on GitHub so phone agents can read it without the laptop.

| File | Purpose |
|------|---------|
| [GROK.md](./GROK.md) | **Start here, Grok Bot** — Track C boot, claim rules, finish steps, chat prompt |
| [MASTERPLAN.md](./MASTERPLAN.md) | Tracks A/B (DONE) + **Track C (ACTIVE)** + Horizons 2–3 |
| [QUEUE.md](./QUEUE.md) | Ordered work — work only on your **assigned** `OPEN` ID |
| [log/](./log/) | One log file per Track C ID (workers write here, not AGENT_LOG) |
| [HANDOFF.md](./HANDOFF.md) | PR rules, AGENT_LOG, how the laptop Planner reviews your work |
| [AGENT_LOG.md](./AGENT_LOG.md) | Append-only work log (you write; Planner reads later) |
| [PLANNER.md](./PLANNER.md) | Run a **Planner** Cloud Agent / Grok Bot from work (review/merge, not implement) |
| [phases/](./phases/) | One card per remote-capable slice |

**Track C (week 1, 2026-09-27):** **CLOUD-C0 OPEN** (CI gate) → wave 1 C1 / C3 / C6 → wave 2 C2 / C5. Week 2: C4 / C7. Rules in [GROK.md](./GROK.md). **QUEUE wins.**

**Secrets:** Confirmed OK when dashboard has all 10 fixture Runtime Secrets on `mohammedumar9919/zeref` (see [../REMOTE_AGENTS.md](../REMOTE_AGENTS.md)). `ZEREF_BFF_FIXTURE=1` is already in that set. Live `FACEBOOK_*` is laptop-only.

**Skills:** In-repo `.cursor/skills/**` always load. On laptop enable **Settings → Agents → Sync Skills for Cloud Agents**. Full Planner prompt: [PLANNER.md](./PLANNER.md).

**Fixture demo (CLOUD-A0):** Windows `.\scripts\demo-start.ps1` (no Docker). Cloud: Secrets already set — `npm run dev -w @zeref/web`. Studio entity id `550e8400-e29b-41d4-a716-446655440001` — [../CURRENT_STATE.md](../CURRENT_STATE.md) · [../../fixtures/README.md](../../fixtures/README.md).

**College submission pack (CLOUD-A5):** [../submission/](../submission/) — abstract, 4-beat script, slide outline. Title claim stays: *ZEREF — An Autonomous JARVIS Command Center for Instagram Growth*.

---

## Boot (every Grok Bot / Cloud session)

Follow [GROK.md](./GROK.md) §1–§4. Short version:

1. Read [../CURRENT_STATE.md](../CURRENT_STATE.md), then **GROK → MASTERPLAN → QUEUE → your phase card → HANDOFF**
2. Read [../failures-checklist.md](../failures-checklist.md)
3. Work only on your **assigned** ID, and only if it is `OPEN`
4. Draft PR after first commit; write `docs/cloud/log/<ID>.md` (not AGENT_LOG / QUEUE)
5. CI green → PR ready → reply with URL → stop

---

## Hard rules

- Fixture mode only unless Secrets include live keys (default: mocks ON)
- Branch name: `cloud/<phase-id>-short-slug` (e.g. `cloud/p62-workspace-hud`)
- Never force-push `main`; never commit `.env` / tokens
- Do not edit Planner files under the user's local `.cursor/plans/`
- Laptop-only: Docker Postgres reset, mic/PTT UAT, Luke screenshot sign-off, college video recording
