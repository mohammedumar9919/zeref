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

Remote / phone agents (Cursor Cloud Agents, Grok Bot) **must** boot from [docs/cloud/GROK.md](docs/cloud/GROK.md) (then [docs/cloud/README.md](docs/cloud/README.md)).

- Work queue: [docs/cloud/QUEUE.md](docs/cloud/QUEUE.md) — work only on the **assigned** ID, only if `OPEN`; max 3 parallel chats
- Masterplan (cloud copy): [docs/cloud/MASTERPLAN.md](docs/cloud/MASTERPLAN.md)
- Handoff + PR rules: [docs/cloud/HANDOFF.md](docs/cloud/HANDOFF.md)
- Track C workers write `docs/cloud/log/<ID>.md`; the Planner owns QUEUE / AGENT_LOG / CURRENT_STATE
- Prefer **fixture mode** Secrets; never commit secrets
- Branch `cloud/<id>-slug` from latest `main` → draft PR → CI green → stop
- Track C **ACTIVE** (C0–C7 cards). Still forbidden without a QUEUE row + card: Meta publish, Next 16, Instagram scrape, auth product, Jarvis pack promotion (`--approve` is human-only)
- Environment: [`.cursor/environment.json`](.cursor/environment.json) + [`.cursor/Dockerfile`](.cursor/Dockerfile)
