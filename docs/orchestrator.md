# Lead orchestrator playbook — Zeref

Phase boundaries, file ownership, merge policy. **Workers:** see [AGENTS.md](../AGENTS.md).

**Related:** [MULTI_AGENT_WORKFLOW.md](./MULTI_AGENT_WORKFLOW.md) · [api-contracts.md](./api-contracts.md) · [failures-checklist.md](./failures-checklist.md)

---

## Roles

| Role | Responsibility |
|------|----------------|
| **Planner** | Master plan, phase contracts, sign-off, fault analysis |
| **Lead orchestrator** | Task cards, council review, verify coordination |
| **Worker agents** | One vertical slice; exclusive file ownership |
| **Human** | Gate 1: approve contract. Gate 2: approve merge after verify |

---

## Agent slots (Zeref)

| Agent | Phase scope | Owns (exclusive) | Must NOT touch |
|-------|-------------|------------------|----------------|
| **Contracts** | all | `packages/contracts/**`, fixtures | apps, db migrations |
| **Data** | 1+ | `packages/db/**` | worker handlers |
| **Worker** | 2–4 | `apps/worker/**`, instagram/analytics/reports packages | `apps/web/**` |
| **BFF** | 5+ | `apps/web/app/api/**`, bff libs | UI components |
| **UI** | 5+ | cockpit UI, globe, Playwright | worker, contracts |
| **QA** | all | verify scripts, CI | feature impl |

**Max parallel agents:** 2–3. Never two agents on the same file.

---

## Phase gates

```powershell
.\scripts\phase_gate.ps1 -Phase 0
.\scripts\phase_gate.ps1 -Phase 5   # current ship target
```

| Phase | Exit gate |
|-------|-----------|
| 0 | scaffold + contracts smoke |
| 1 | DB migrations + snapshot model |
| 2 | collect + merge + enqueue CLI |
| 3 | normalize + embed |
| 4 | analyze + report + elite JSON |
| 5 | cockpit + BFF + Playwright |
| **5.0.1** | worker daemon + dev:stack + BFF error UX (planned) |
| **5.1** | Luke HUD visual + ADR-015 amend (planned) |
| 6 | voice (blocked until 5.1) |

---

## Merge policy

1. Council Stage 2 for critical paths (see [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md))
2. User runs verify in terminal
3. Update [CURRENT_STATE.md](./CURRENT_STATE.md)
4. Planner sign-off for phase completion

---

## Phase 5.1 multi-agent template

Lead outputs separate prompts for:

- **Agent UI** — HUD layout, globe, telemetry shell
- **Agent BFF** — SSE events (if in contract)
- **Agent Worker** — job event emission
- **Agent QA** — verify:phase-5.1, Playwright visual smoke
- **Agent Docs** — ADR-015 amendment

Then **STOP**.

---

## User gates

| Gate | When |
|------|------|
| **Gate 1** | Planner approves phase contract before workers start |
| **Gate 2** | User approves merge after `phase_gate.ps1` green + Planner sign-off |
