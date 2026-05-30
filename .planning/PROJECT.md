# Zeref — PROJECT

**Product:** Personal Instagram/social ops command center with Jarvis-style AI operator layer.  
**Repo:** https://github.com/mohammedumar9919/zeref  
**Legacy reference (read-only):** `c:\Projects\instagram-ops-studio`

---

## Vision

One-screen **cockpit**: Studio + Calendar | **globe** | Reports + Research. Minimal nav (Cockpit | Settings). Pipeline: collect → normalize → embed → analyze → report. Phase 6+ adds voice (Whisper STT + OpenRouter + TTS).

Visual target: **Luke JARVIS HUD** ([reference](../docs/design/reference/lukebuildsai-jarvis-hud.jpeg)).

---

## Orchestration stack

Karpathy 3-stage council + GSD Redux phases + Superpowers TDD + UI UX Pro Max. See [PORTABLE_AGENT_STACK_SETUP.md](../docs/PORTABLE_AGENT_STACK_SETUP.md).

| Role | Chat |
|------|------|
| Planner | Master plan + phase sign-off |
| Lead orchestrator | Task cards, council, verify |
| Workers | Scoped implementation |

---

## Monorepo layout

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js 15 cockpit + BFF |
| `apps/worker` | pg-boss pipeline handlers |
| `apps/api` | Phase 0 stub (BFF lives in web) |
| `packages/contracts` | Zod schemas |
| `packages/db` | Drizzle + Postgres |
| `packages/instagram` | Collect + merge |
| `packages/analytics` | Analyze inputs |
| `packages/reports` | Elite report builder |
| `packages/domain` | Stub |

**Planned:** `apps/whisper`, `packages/jarvis-kernel`, `packages/zeref-memory`

---

## Current phase

**5 complete (implementation)** → **5.0.1 ops** → **5.1 Luke HUD** → **6 voice**

Runtime truth: [docs/CURRENT_STATE.md](../docs/CURRENT_STATE.md)
