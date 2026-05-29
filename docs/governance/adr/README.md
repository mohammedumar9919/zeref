# Architecture Decision Records

**Verification:** [verify.md](../verify.md)

## Phase 1 (contracts + snapshot DB)

**Contract:** [phase-1-contract.md](../phase-1-contract.md) (C1–C6)

| ADR | Topic | Owner |
|-----|--------|-------|
| [ADR-001](./ADR-001-snapshot-data-model.md) | Tables, FK graph, immutability triggers | Data |
| [ADR-002](./ADR-002-id-branding.md) | Branded UUID types in `@zeref/contracts` | API/Contracts |
| [ADR-003](./ADR-003-openapi-from-zod.md) | OpenAPI from Zod; CI derivation plan | API/Contracts |

**Reading order:** ADR-001 → ADR-002 → ADR-003

## Phase 2 (Instagram collect)

**Contract:** [phase-2-contract.md](../phase-2-contract.md) (Q1–Q4, C7–C10)  
**Legacy salvage:** [legacy-ios.md](../../handoff/legacy-ios.md) (merge-by-shortcode)

| ADR | Topic | Owner |
|-----|--------|-------|
| [ADR-004](./ADR-004-instagram-merge.md) | Merge-by-shortcode payload (Q1) | Scrape + API |
| [ADR-005](./ADR-005-worker-collect.md) | pg-boss collect + C8 dedupe (C9) | Worker |
| [ADR-006](./ADR-006-parse-fetch-live.md) | parse vs fetch vs live verify (Q3, C10) | QA |

**Reading order:** ADR-004 → ADR-005 → ADR-006

## Planner quick reference

| ID | ADR / doc |
|----|-----------|
| C1–C6 | Phase 1 — ADR-001, ADR-002, verify `phase-1` |
| Q1 | ADR-004 — one merged row per shortcode |
| Q2 | ADR-004 — Graph MVP fields |
| Q3 | ADR-006 — no Playwright in CI |
| Q4 | ADR-005 — CLI enqueue only |
| C7 | `@zeref/contracts` — `CollectJobOutput`, `PHASE2_CONTRACT_VERSION` |
| C8 | ADR-005 — dedupe returns existing `snapshotId` |
| C9 | ADR-005 — worker registry collect-only |
| C10 | ADR-006 + verify.md — CI runs `verify:phase-2` |

## Related

- [Phase 0 contract](../phase-0-contract.md)
- [Legacy handoff](../../handoff/legacy-ios.md)
