# ADR-002: ID branding strategy

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** API/Contracts agent  
**Phase:** 1  
**Related:** [Phase 1 contract](../phase-1-contract.md) · [ADR index](./README.md) · [ADR-001](./ADR-001-snapshot-data-model.md) · [ADR-003](./ADR-003-openapi-from-zod.md) · [verify.md](../verify.md)

## Context

Pipeline tables and job payloads reference many UUID primary keys (`snapshots.id`, `normalized_entities.id`, etc.). We need a single strategy for TypeScript types vs JSON wire format.

## Decision

Use **branded TypeScript types via Zod `.brand()`**, serialized as **plain UUID strings** in JSON and stored as **`uuid` columns** in Postgres.

### Branded ID types (`@zeref/contracts`)

| Brand | Schema export | Used in |
|-------|---------------|---------|
| `PlatformAccountId` | `PlatformAccountIdSchema` | Collect jobs, `platform_accounts.id` |
| `SnapshotId` | `SnapshotIdSchema` | Normalize/analyze/report lineage |
| `NormalizedEntityId` | `NormalizedEntityIdSchema` | Analyze/report lineage |
| `AnalysisOutputId` | `AnalysisOutputIdSchema` | Report lineage |
| `ReportArtifactId` | `ReportArtifactIdSchema` | Future artifact references |

Implementation: `z.string().uuid().brand<"SnapshotId">()` in `packages/contracts/src/ids.ts`.

### Wire format

- **JSON/API:** standard lowercase UUID strings (RFC 4122).
- **DB:** `uuid` type; no custom encoding.
- **Runtime:** Zod brands are erased; values remain strings after `parse()`.

### Rejected alternative: plain `string` aliases

Plain `type SnapshotId = string` would not prevent accidental cross-ID assignment at compile time. Branding catches `snapshotId` passed where `analysisOutputId` is expected.

## Consequences

- Contract tests round-trip fixtures as JSON strings (brands do not change serialization).
- Drizzle schema uses `uuid()` columns without TS branding (DB package imports table types separately).
- New pipeline entities add a branded schema in `ids.ts` and export from `@zeref/contracts`.

## Verification

```powershell
cd c:\Projects\zeref
npm run build
npm -w @zeref/contracts test
```
