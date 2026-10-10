# CLOUD-C18a — Graph call budget + usage-header back-off

- Package-only (`packages/instagram`). New `graph/usage.ts` (`parseGraphUsage`, `GraphBudget`, `createInMemoryDailyBudget` with UTC-midnight reset + injectable `now`, `GraphThrottledError`, `redactGraphSecrets`, `retryAfterMinutes`), new `graph/token-debug.ts` (`debugTokenExpiry`), `graphGet` now exported with optional `GraphGetOptions { budget?, onUsage?, throttleAtPct? = 80 }`; client helpers accept `graph?: GraphGetOptions`.
- Back-compat: callers that pass no options never hit `daily_cap` / `usage_high`; HTTP 429 now throws `GraphThrottledError("http_429")` (still an `Error`, message keeps `Graph API 429`). Non-OK bodies and network errors are token-redacted.
- Local results: `tsc -b tsconfig.build.json` clean; instagram 36 pass / 0 fail / 1 skipped (pre-existing live smoke), 19 new tests in `graph-budget.test.mjs` incl. `SECRET_TOKEN_123` leak checks; worker 13 pass / 0 fail / 8 cancelled (Postgres not running locally).
- Next: C18b wires the budget + schedule, audit table, "what changed" diff.
