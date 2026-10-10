# C18b — Own-account watch (opt-in schedule, audit, "what changed")

Part 2 of C18. Builds on C18a (`GraphBudget`, `GraphThrottledError`, `debugTokenExpiry` in `@zeref/instagram`).

## Problems today

- `apps/worker/src/boss.ts` always registers `schedule-collect` (no opt-in), default every 6 h.
- `schedule-collect.ts` builds collect input only from `ZEREF_COLLECT_SHORTCODES` / `ZEREF_COLLECT_GRAPH_MEDIA_ID`; with neither set, `CollectJobInputSchema.parse` throws, so scheduled runs fail.
- No daily call cap, no single-run lock, no audit row, no diff.

## Deliverables

1. **Opt-in:** schedule registered only when `ZEREF_WATCH_ENABLED=1`; when off, unschedule any existing `schedule-collect` schedule. Default interval 4 h (`ZEREF_COLLECT_INTERVAL_HOURS` still overrides; clamp 1–24).
2. **Fix target:** scheduled run finds the newest own media id itself (same idea as `apps/web/lib/jobs/enqueue-job.ts` newest-media lookup — reimplement in the worker, do not import from apps/web) when no env target is set.
3. **Budget:** daily Graph call cap `ZEREF_GRAPH_DAILY_CAP` (default 200) via `GraphBudget`, persisted so it survives restarts (count calls from today's `watch_runs`). `GraphThrottledError` → run ends `throttled`, no retry storm (next schedule tick only).
4. **One run at a time:** Postgres advisory lock around a watch run; a second concurrent trigger records `skipped_locked` and exits.
5. **Audit:** new table `watch_runs` (migration `0006_c18_watch_runs.sql`): `id`, `trigger` (`schedule` | `on_demand` | `task_scheduler`), `started_at`, `finished_at`, `status` (`ok` | `throttled` | `skipped_locked` | `skipped_disabled` | `skipped_no_token` | `error`), `graph_calls`, `max_usage_pct`, `token_expires_at`, `error_code` (no raw messages containing tokens), `diff_json`.
6. **Token expiry:** if `INSTAGRAM_APP_TOKEN` is set, call `debugTokenExpiry` at most once per day; store on the run; log a warning when < 7 days left. Never log tokens.
7. **What changed:** compare the latest two snapshots per `sourceRef` (likes, comments, reach/impressions where present, new/removed posts); `diff_json` includes both `collectedAt` values so any reply can say "data collected at …".
8. **Task Scheduler (interim always-on):** `scripts/watch-collect.ps1` (loads `.env`, enqueues one `task_scheduler` run) and `scripts/register-watch-task.ps1` (`Register-ScheduledTask`, every 4 h, current user, `-WhatIf` support). Neither prints secrets.

## Rules

- Migration + new table → **council review required**.
- Tokens never in DB, logs or errors.
- No change to `packages/contracts` (keep `trigger` only in `watch_runs`), `apps/web`, `packages/instagram`.
- Migration number: C18b takes `0006`; C4 vector recall moves to `0007`.
