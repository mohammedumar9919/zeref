# Zeref — STATE

**Updated:** 2026-06-03

## Current position

- **Phase:** 8 in progress — Wave 2 **DONE**
- **P8-A:** `12a0e65` — contracts + migrations (db tests 4/4 green)
- **P8-B:** `10240c3` — BFF studio/calendar/enqueue; web tests 40/40
- **P8-E:** Wave 2 scaffold (verify:phase-8 + CI 0–8 gate) — commit pending integration
- **Phase 7:** **APPROVED** @ `0e7f8d5`

## Next

1. User: spawn **P8-C** + **P8-D** (parallel)
2. P8-C/D: align `CockpitSlices` → `CockpitSlicesV8` in components
3. Wave 4: flip e2e ready flags; user runs `npm run verify:phase-8`

## Follow-up (non-blocking)

- `GET /api/v1/calendar/events/:id` (C73) — not in P8-B card; optional hotfix
- Dev Postgres: `POSTGRES_PORT=5434`, `DATABASE_URL=postgres://zeref:zeref@localhost:5434/zeref`

## Do not start

- P8-E Wave 4 finalize until P8-C + P8-D land
