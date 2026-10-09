# C20a — Split CI into parallel jobs

**Goal:** cut CI wall-clock time from roughly 45–75 min to under 10 min without dropping any verify gate.

## Design

- Each `verify:*` script that chains into earlier phases honours `ZEREF_SKIP_PRIOR_CHAIN=1` and skips only the chained call; its own checks and Playwright specs still run.
- Five parallel jobs each run a group of verify scripts once, with that phase's env flags:
  - `db-phases` — build, lint, Phases 0–4 (Postgres service)
  - `ui-a` — Phases 5, 5.1, 6.1, 6.2, 6
  - `chain-p8` — Phase 8 **without** the skip flag, so one full nested chain (8 → 7 → 6 → 5.1 → 0–5) still runs
  - `ui-b` — Phases 7, 9, hotfix-p8
  - `ops-agent` — Phases 10, 10.5, 11, 12
- Aggregate job keeps the name **`Phase 0–9 gate`** (branch protection / tooling depend on it) and fails if any job failed, was cancelled, or was skipped.

## Local use

Running a verify script without `ZEREF_SKIP_PRIOR_CHAIN` behaves exactly as before (full chain).

## First run

All six jobs green in about 4 min (previously 45–56 min); Playwright specs pass in every UI job.
