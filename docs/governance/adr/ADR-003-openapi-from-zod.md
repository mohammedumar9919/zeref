# ADR-003: OpenAPI derivation from Zod

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** API/Contracts agent  
**Phase:** 1  
**Related:** [Phase 1 contract](../phase-1-contract.md) · [Phase 2 contract](../phase-2-contract.md) · [ADR index](./README.md) · [ADR-001](./ADR-001-snapshot-data-model.md) · [ADR-002](./ADR-002-id-branding.md) · [ADR-004](./ADR-004-instagram-merge.md) · [verify.md](../verify.md)

## Context

Zeref is contract-first: Zod schemas in `@zeref/contracts` are the source of truth. OpenAPI must be derived—not hand-written—to prevent API/docs drift.

## Decision

### Tooling

Use **`@asteasolutions/zod-to-openapi`** (OpenAPI 3.1) with **`zod`** schemas registered via `extendZodWithOpenApi`.

Phase 1 ships a **generation stub** (`scripts/generate-openapi.mjs`) documenting the pipeline; full registry of every schema lands when Fastify/tRPC routes exist (Phase 2+).

### Output artifact

- Generated file (future): `packages/contracts/openapi/zeref-phase1.json`
- Checked into repo once generation is wired in CI (Phase 2+); Phase 1 verifies the ADR + stub script exist.

### CI derivation plan (coordination with QA)

1. **`npm run build`** — compile `@zeref/contracts`.
2. **`node scripts/generate-openapi.mjs`** — emit OpenAPI JSON from registered Zod schemas (stub logs plan until routes exist).
3. **`npm -w @zeref/contracts test`** — fixture round-trips remain the primary Phase 1 gate.
4. **Phase 2+:** CI diff check — fail if committed OpenAPI diverges from generator output without an intentional bump to `PHASE1_CONTRACT_VERSION` / ADR note.

### Schema registration order (when implemented)

1. Enums: `Platform`, `SnapshotKind`, `PipelineStage`, `JobType`
2. Job payloads: `CollectJobInput`, `CollectJobOutput`, `NormalizeJobInput`, `AnalyzeJobInput`, `ReportJobInput`
3. Shared: `InsufficientData`, branded ID string formats (`format: uuid`)
4. **Phase 2 — Instagram / Graph (see [ADR-004](./ADR-004-instagram-merge.md)):** `GraphIgUser`, `GraphMediaFields`, `GraphMediaListResponse`, `ScrapePostFields`, `MergedInstagramPostPayload`

Golden fixtures for Graph shapes: `fixtures/phase-2/graph/*.json` (contract round-trip tests in `@zeref/contracts`).

## Consequences

- No hand-maintained OpenAPI paths in Phase 1.
- `@zeref/contracts` remains the only place to change payload shapes.
- QA `verify:phase-1` can assert this ADR and `scripts/generate-openapi.mjs` exist before enabling strict OpenAPI diff in later phases.

## Verification

```powershell
cd c:\Projects\zeref
Test-Path docs/governance/adr/ADR-003-openapi-from-zod.md
Test-Path scripts/generate-openapi.mjs
node scripts/generate-openapi.mjs
```
