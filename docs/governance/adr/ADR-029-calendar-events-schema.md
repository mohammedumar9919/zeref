# ADR-029: Calendar events schema + scheduling semantics (Phase 8)

**Status:** **APPROVED** (Planner 2026-06-03)  
**Date:** 2026-06-03  
**Owner:** Data agent  
**Related:** Q1 · Q5 · C72 · C76 · Amendment G

---

## Context

Phase 5 Calendar panel is an empty schedule shell. Phase 8 adds persisted events and scheduling UX without a background cron daemon (Q5 defer 8.1+).

---

## Decision

1. **Table `calendar_events`** — `id`, `title`, `scheduledAt` (timestamptz), optional `jobType`, `payload` JSON, `status`: `draft` | `scheduled` | `completed` | `cancelled`, `createdAt`, `updatedAt`.
2. **MVP execution** — user triggers enqueue when `scheduledAt <= now` via UI action; no daemon polling in Phase 8.
3. **Honest UX** — badge when scheduler daemon absent (Phase 8.1); events still creatable.
4. **BFF** — CRUD routes under `/api/v1/calendar/events`.
5. **Slices** — populate calendar panel from DB; `fixtures/phase-8/` for CI.

---

## Consequences

- `loadCockpitSlices()` reads `calendar_events` instead of always-empty array.
- Optional link `calendarEventId` on job enqueue body (ADR-030).

---

## Verification

- Migration applies on dev Postgres.
- Fixture mode returns seeded calendar items when `ZEREF_BFF_FIXTURE=1`.
