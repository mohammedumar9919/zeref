# ADR-028: Studio editor + draft storage (Phase 8)

**Status:** **APPROVED** (Planner 2026-06-03)  
**Date:** 2026-06-03  
**Owner:** Data + BFF agents  
**Related:** Q2 · C71–C72 · C75 · C78 · Amendment G · [ADR-001](./ADR-001-snapshot-data-model.md)

---

## Context

Phase 5 Studio panel is a placeholder list ([phase-5-contract.md](../phase-5-contract.md) L84). Operators need to review normalized entities and save **draft** caption/notes without mutating immutable snapshots (C6).

---

## Decision

1. **Table `studio_drafts`** — keyed by `entityId` (FK to normalized entity); fields: `caption`, `notes`, `tags` (JSON), `updatedAt`.
2. **BFF** — `GET /api/v1/studio/entities/:id` returns read-only normalized summary + optional draft overlay.
3. **BFF** — `PUT /api/v1/studio/drafts/:entityId` upserts draft only; **never** UPDATE snapshot tables.
4. **UI** — `/cockpit/studio/[entityId]` with `data-testid="studio-editor"`.
5. **Contracts** — `StudioDraftSchema`, additive `hasDraft` / `draftPreview` on studio items in `phase8-cockpit-v1`.

---

## Consequences

- P8-A owns migration + phase8 contracts.
- P8-B owns BFF routes; P8-C owns UI.

---

## Verification

- Unit test: draft upsert does not touch snapshot rows.
- E2E: open studio entity, edit draft, reload persists (fixture or seeded DB).
