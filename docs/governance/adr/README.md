# Architecture Decision Records (Phase 1)

**Phase contract:** [phase-1-contract.md](../phase-1-contract.md) (C1–C6)  
**Verification:** [verify.md](../verify.md) — `npm run verify:phase-1`

Phase 1 ADRs are **accepted** once domain agents have filled decision bodies. Docs owns this index and cross-links; **Data** owns ADR-001 content; **API/Contracts** owns ADR-002 and ADR-003.

## ADR map

| ADR | Topic | Owner | Depends on |
|-----|--------|-------|------------|
| [ADR-001](./ADR-001-snapshot-data-model.md) | Tables, FK graph, immutability triggers (C1, C2, C5, C6) | Data | Phase 1 contract |
| [ADR-002](./ADR-002-id-branding.md) | Branded UUID types in `@zeref/contracts` | API/Contracts | ADR-001 (column alignment) |
| [ADR-003](./ADR-003-openapi-from-zod.md) | OpenAPI 3.1 from Zod; CI derivation plan | API/Contracts | ADR-002 (ID wire format) |

## Reading order

1. **ADR-001** — what exists in Postgres and what must never mutate.
2. **ADR-002** — how IDs appear in TypeScript and JSON.
3. **ADR-003** — how API docs stay derived from Zod (stub in Phase 1; strict diff in Phase 2+).

## Planner conditions (quick ref)

| ID | ADR / area |
|----|------------|
| C1 | ADR-001 — `platform_accounts` |
| C2 | ADR-001 — `report_artifacts` |
| C3 | verify.md + CI — `verify:phase-1` |
| C4 | fixtures + `@zeref/contracts` tests |
| C5 | ADR-001 — no pgvector |
| C6 | ADR-001 — snapshot triggers + contract job payloads (ADR-002) |

## Related docs

- [Phase 0 contract](../phase-0-contract.md)
- [Legacy handoff](../../handoff/legacy-ios.md) — why immutability and verify gates exist
