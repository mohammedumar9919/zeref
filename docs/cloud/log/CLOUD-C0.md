# CLOUD-C0 — CI green (gate)

- Agent: grok-cloud
- Branch: cloud/c0-ci-green
- PR: https://github.com/mohammedumar9919/zeref/pull/20
- Status: blocked

## Done

- Playwright webServer timeout (main run `36353883691`, step Verify Phase 5): `apps/web/playwright.config.ts` probed `http://127.0.0.1:3099/cockpit` while `npm run start` is `next start --port 3000` (commit `319f9e1`). Next stayed up on 3000, so the 120000ms readiness check timed out with no Next stderr. The webServer command is now `npx --no-install next start --hostname 127.0.0.1 --port ${PORT}`. After that change, the same step's Playwright run finishes (17 passed, 41 skipped).
- `packages/db/test/migrations.test.mjs` does not spawn `docker compose up` when `DATABASE_URL` is set or `CI` is `true`/`1`. That removed the `Bind for 0.0.0.0:5432 failed` noise from Verify Phase 1, 3, and 4. The Postgres suite still runs when `DATABASE_URL` is set and skips when it is unset and Docker is unavailable.

## Tests

- `npm ci` — pass
- `npm run build` — pass (Next.js 15.5.18)
- `npm run lint` — pass
- `npm test -w @zeref/db` — pass (5 guard tests; migration suite skipped: DATABASE_URL unset and Docker unavailable)
- Local `node scripts/verify-phase-5.mjs` with `CI=true` and fixture mocks, phase flags unset — Playwright 17 passed, 41 skipped, then process exit 1
- CI runs `36363340109` and `36363342712` — Phase 0–9 gate fail in Verify Phase 5, exit code 1, about 4–5 min (not the 120s webServer timeout)

## Not done / blocked

Exact error (printed at the start of Verify Phase 5, then the script continues because `fail()` only sets `process.exitCode`; Playwright still passes; the step exits 1). Same four lines are in main run `36353883691` and PR runs `36363340109` / `36363342712`:

```
[verify:phase-5] C30: apps/web/lib/jarvis/competitor-discovery.ts must not import @zeref/instagram
[verify:phase-5] C30: apps/web/lib/jarvis/instagram-snapshot.ts must not import @zeref/instagram
[verify:phase-5] C30: apps/web/lib/ops/facebook-health.ts must not import @zeref/instagram
[verify:phase-5] C30: apps/web/lib/ops/instagram-health.ts must not import @zeref/instagram
```

Imports that trip the guard (ADR-018 C30: no `@zeref/instagram` import statements under `apps/web`):

- `apps/web/lib/jarvis/competitor-discovery.ts` — `fetchCompetitorDiscovery`, `DEFAULT_FACEBOOK_GRAPH_BASE`, `CompetitorDiscoveryResult`, `GraphFetch` from `@zeref/instagram`
- `apps/web/lib/jarvis/instagram-snapshot.ts` — `fetchAccountInsights`, `fetchInstagramMedia`, `fetchInstagramUser`, `fetchMediaInsights`, `probeInsightsAvailable`, `InstagramInsightMetric` from `@zeref/instagram`
- `apps/web/lib/ops/facebook-health.ts` — `fetchCompetitorDiscovery`, `DEFAULT_FACEBOOK_GRAPH_BASE`, `GraphFetch` from `@zeref/instagram`
- `apps/web/lib/ops/instagram-health.ts` — `probeInsightsAvailable` from `@zeref/instagram`

Those files are outside the C0 allowed paths. Loosening the C30 assertion in `scripts/verify-phase-5.mjs` is forbidden. Stopped for Planner approval. Later verify steps never start because this step exits 1.

## Laptop follow-up

- Planner decides how C30 should treat these four `apps/web/lib` modules (move the Graph calls out of `apps/web`, or amend the guard). Do not skip the assertion.
- After that, re-run the Phase 0–9 gate. The Playwright port fix and the compose guard are already on this branch.
- Planner merges first; wave-1 branches (C1, C3, C6) are cut after this merge.
- Planner updates QUEUE, AGENT_LOG, and CURRENT_STATE.
