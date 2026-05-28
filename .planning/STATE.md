# Zeref — STATE

**Updated:** 2026-05-28

## Current position

- **Phase:** 1 (implementation)
- **Last completed:** Phase 0 (planner-approved 2026-05-27)
- **Blocker:** none

## Planner decisions

- Phase 1 contract approved with **C1–C6** ([phase-1-contract.md](../docs/governance/phase-1-contract.md)):
  - **C1** — `platform_accounts` table
  - **C2** — `report_artifacts` table (storage only; no report UI)
  - **C3** — CI runs `npm run verify:phase-1` on every push/PR
  - **C4** — Golden fixtures under `fixtures/phase-1/`
  - **C5** — No pgvector / embedding tables in Phase 1
  - **C6** — Snapshot immutability (no UPDATE of snapshot payload columns; downstream uses IDs only)

## Governance entry points

| Artifact | Path |
|----------|------|
| Phase 1 contract | `docs/governance/phase-1-contract.md` |
| Verify commands | `docs/governance/verify.md` |
| ADR index | `docs/governance/adr/README.md` |
| ADR-001 (data model) | `docs/governance/adr/ADR-001-snapshot-data-model.md` |
| ADR-002 (ID branding) | `docs/governance/adr/ADR-002-id-branding.md` |
| ADR-003 (OpenAPI from Zod) | `docs/governance/adr/ADR-003-openapi-from-zod.md` |

## Phase 1 checklist

- [x] `docs/governance/phase-1-contract.md` (Planner)
- [x] ADR structure + cross-links (Docs)
- [x] ADR-001 body (Data)
- [x] ADR-002 / ADR-003 bodies (API/Contracts)
- [x] `docs/governance/verify.md` Phase 1 section (Docs)
- [ ] Drizzle schema + migrations (Data — confirm in verify log)
- [ ] `@zeref/contracts` schemas + `fixtures/phase-1/` (API/Contracts — confirm in verify log)
- [x] `scripts/verify-phase-1.mjs` + CI `verify:phase-1` wiring (QA — present; full green pending DB)
- [ ] `npm run verify:phase-0` and `npm run verify:phase-1` green locally + CI
- [ ] Planner sign-off on Phase 1 verify log

## Session log

| When | Who | What |
|------|-----|------|
| 2026-05-27 | Planner | Phase 0 approved |
| 2026-05-27 | Orchestrator | Repo scaffold, GSD, Phase 0 docs |
| 2026-05-28 | Planner | Phase 1 contract approved (C1–C6) |
| 2026-05-28 | Docs | STATE, ADR index, `verify.md` Phase 1 cross-links |

## Agent roster (Phase 1)

| Agent | Status | Deliverables |
|-------|--------|----------------|
| Docs | Done | STATE, ADR index, `verify.md` cross-links |
| Data | Report back | Schema, migrations, ADR-001 |
| API/Contracts | Report back | Zod, fixtures, ADR-002/003 |
| QA | Report back | `verify-phase-1.mjs`, CI (C3) |

## Do not start

- Phase 2 (collectors/scrape) until Planner signs off Phase 1

## Verify (orchestrator)

```powershell
cd c:\Projects\zeref
docker compose up -d db
npm install
npm run verify:phase-0
npm run verify:phase-1
```

See [verify.md](../docs/governance/verify.md).
