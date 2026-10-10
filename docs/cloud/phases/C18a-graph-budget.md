# C18a — Graph call budget + usage-header back-off

**Goal:** before C18 runs collect every 4 hours, the Instagram Graph client must never blow through Meta's rate limits or a daily call cap. Part 1 of C18 (own-account watch); C18b adds the opt-in schedule, audit table, "what changed" diff and Task Scheduler script.

Today `packages/instagram/src/graph/client.ts` `graphGet` is a bare fetch: no usage headers read, no call counting, no back-off, no token-expiry info.

## Deliverables (package-only)

1. `packages/instagram/src/graph/usage.ts`
   - `parseGraphUsage(headers)` reads `x-app-usage` and `x-business-use-case-usage` (JSON; tolerate missing/malformed → `null`) and returns `{callCountPct, totalTimePct, totalCputimePct, maxPct, estimatedTimeToRegainAccessMin?}`.
   - `GraphBudget` interface `{ tryConsume(n?): boolean; used(): number; cap(): number }` and `createInMemoryDailyBudget({cap, now?})` that resets at UTC midnight.
   - `GraphThrottledError` (typed, with `reason: "daily_cap" | "usage_high" | "http_429"` and optional `retryAfterMin`).
2. `client.ts`: optional `{budget?, onUsage?, throttleAtPct = 80}` options on `graphGet` (existing call sites unchanged, defaults preserve behaviour). Before fetch: `budget.tryConsume()` false → throw `GraphThrottledError("daily_cap")` without calling fetch. After fetch: call `onUsage(parsed)`; HTTP 429 or `maxPct ≥ throttleAtPct` → throw `GraphThrottledError` (for usage_high, only after returning nothing — the caller must stop further calls).
3. `debugTokenExpiry({fetchImpl, appToken, inputToken})` → `{expiresAt: Date | null, isValid}` via Graph `debug_token`; never log the token.
4. Export all from the package index.

## Rules

- Tokens never appear in errors, logs or thrown messages (test-enforced with a fake token string).
- No real network in tests: use the injectable `fetchImpl`.
- No apps/**, packages/db/**, packages/contracts/** changes.
