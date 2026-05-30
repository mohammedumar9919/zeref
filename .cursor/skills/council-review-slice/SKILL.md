---
name: council-review-slice
description: Stage 2 — Review worker proposals against failures-checklist and verify impact. Approve, Concern, or Block before merge.
---

# Council Stage 2 — Review

## Mandatory for

- `packages/contracts/**`, `packages/db/**`
- `apps/worker/**` job handlers and auto-chain policy
- `apps/web/app/api/**` BFF routes
- `docs/governance/phase-*-contract.md`, `docs/api-contracts.md`
- ADR changes under `docs/governance/adr/`

## Checklist

1. `docs/failures-checklist.md` — any anti-pattern reintroduced?
2. Ownership — single agent per file?
3. Verify impact — will `verify:phase-0` … `verify:phase-5` still pass?
4. Snapshot immutability — no re-scrape in downstream jobs?
5. BFF — no silent empty cockpit on errors?
6. UI — no fake metrics / theater telemetry?

## Vote

- **Approve** — proceed to Stage 3
- **Concern** — merge with documented follow-up in GAP_BACKLOG
- **Block** — fix before merge

## Personas

Review as Agent Worker (pipeline), Agent Data (schema), Agent UI (cockpit), Security (no secrets in repo). See `config/council/zeref-board.yaml`.
