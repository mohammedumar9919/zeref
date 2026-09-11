# Agent instructions (Zeref)

**New chat:** Boot from [docs/LEAD_ORCHESTRATOR.md](docs/LEAD_ORCHESTRATOR.md) and [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).

Concise rules for Cursor worker agents. Lead uses [docs/orchestrator.md](docs/orchestrator.md) for phase gates.

---

## Read first (every task)

1. [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md)
2. [docs/failures-checklist.md](docs/failures-checklist.md)
3. [docs/api-contracts.md](docs/api-contracts.md)
4. [docs/governance/verify.md](docs/governance/verify.md)
5. Relevant [docs/governance/phase-*-contract.md](docs/governance/)

Do **not** edit `C:\Users\Owner\.cursor\plans\*.plan.md`.

---

## Ownership (current phase)

| Agent | You may edit | Forbidden |
|-------|--------------|-----------|
| **Contracts** | `packages/contracts/**`, `fixtures/**`, OpenAPI gen | `apps/web/components/**`, worker handlers |
| **Data** | `packages/db/**`, migrations | worker job logic without contract bump |
| **Worker** | `apps/worker/**`, `packages/instagram/**`, `packages/analytics/**`, `packages/reports/**` | `apps/web/**`, raw schema without Data agent |
| **BFF** | `apps/web/app/api/**`, `apps/web/lib/cockpit-bff*`, `apps/web/lib/bff.ts` | `apps/web/components/**` (UI agent) |
| **UI** | `apps/web/app/cockpit/**`, `apps/web/app/settings/**`, `apps/web/components/**`, Playwright specs | BFF routes except read for integration |
| **QA** | `scripts/verify-*.mjs`, `.github/workflows/**`, `scripts/phase_gate.*` | feature code in worker/UI |
| **Orchestrator / Lead** | `docs/**`, `.planning/**`, task cards, merges | worker/UI paths when assigned to agents |

**Shared read-only:** phase contracts, ADRs, `docs/design/reference/*`

**One file, one owner.** If your task requires a forbidden path, stop and ask the Lead.

---

## Engineering constraints

- Snapshot immutability — no re-scrape in normalize/embed/analyze/report
- `@zeref/contracts` is single source of truth for JSON shapes
- BFF-only browser API
- Mock flags in CI: `ZEREF_LLM_MOCK`, `ZEREF_BFF_FIXTURE`
- Frontend: invoke **ui-ux-pro-max** — Jarvis HUD aesthetic

---

## Verification

From repo root after your slice:

```powershell
npm run build
npm run lint
.\scripts\phase_gate.ps1 -Phase <n>
```

---

## Cursor delegation

Rules: `.cursor/rules/lead-orchestrator.mdc`, `council-governance.mdc`  
Skills: `council-propose-slice`, `run-verify-gate`, Superpowers TDD

When spawning subagents, include ownership table and exact acceptance command.

---

## Cursor Cloud specific instructions

Remote / phone agents (Cursor Cloud Agents, Grok Bot) **must** read [docs/REMOTE_AGENTS.md](docs/REMOTE_AGENTS.md) before coding.

- Prefer **fixture mode**: `ZEREF_BFF_FIXTURE=1` + mock flags from Secrets (never commit secrets).
- Work on a **branch** and open a **PR**. Never force-push `main`.
- Do **not** assume laptop Docker Postgres or Whisper sidecar are available.
- Track A only until college freeze: Phase **6.2** UI first; no Meta publish, no Next 16 upgrade, no Instagram scrape.
- Environment: [`.cursor/environment.json`](.cursor/environment.json) + [`.cursor/Dockerfile`](.cursor/Dockerfile) (`npm ci` on Node 22).
