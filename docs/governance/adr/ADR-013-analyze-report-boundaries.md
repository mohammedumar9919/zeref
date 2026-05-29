# ADR-013: Analyze and report boundaries (no instagram)

**Status:** Accepted (Phase 4)

## Context

Collectors live in `@zeref/instagram`. Downstream stages read DB by ID only (C14, C19).

## Decision

- **`analyze`** and **`report`** handlers and `@zeref/reports` must not import `@zeref/instagram`.
- `verify:phase-4` static-guards listed paths (C19).

## Consequences

- Scrape/Graph changes stay in collect phase or instagram package only.
- Analysis reads `normalized_entities`, `metric_facts`, `embedding_vectors`, `analysis_outputs`.
