# CLOUD-C0 — CI green (gate)

- Agent: grok-cloud
- Branch: cloud/c0-ci-green
- PR: https://github.com/mohammedumar9919/zeref/pull/20
- Status: blocked

## Done

- Playwright webServer timeout (main run `36353883691`, step Verify Phase 5): readiness is `http://127.0.0.1:${PLAYWRIGHT_PORT}/cockpit` (default 3099) while `npm run start` is `next start --port 3000`. The Playwright webServer command is now `npx --no-install next start --hostname 127.0.0.1 --port ${PORT}`.
- `packages/db/test/migrations.test.mjs` does not spawn `docker compose up` when `DATABASE_URL` is set or `CI` is `true`/`1`.
- The copied `@zeref/instagram` web import check now follows the jarvis-kernel shape in C30, C50, C59, C70, and C78. Allowed only in server-only modules under `apps/web/lib/jarvis/**` and `apps/web/lib/ops/**`. Blocked under `apps/web/app/**`, `apps/web/components/**`, any `use client` file, and every other `apps/web` path.
- C91 in `apps/web/e2e/cockpit-hud-6.1.spec.ts` no longer hardcodes `Phase 6.1`. The header shows `getActivePhaseLabel()`, which is `Phase ${PHASE10_CONTRACT_VERSION.split(".")[0]}` (currently `Phase 10`). The assertion is an exact text match on that template, importing `PHASE10_CONTRACT_VERSION` from `@zeref/contracts`. No app code was changed. Verify Phase 5 inside run `36366409457` printed `[verify:phase-5] OK`.

## Tests

- `npm ci`, `npm run build`, `npm run lint` — pass (earlier on this branch)
- `npm test -w @zeref/db` — pass
- Local `CI=true` `node scripts/verify-phase-5.mjs` — exit 0
- Local `ZEREF_PHASE61_UI=1` `npm -w @zeref/web run test:e2e -- e2e/cockpit-hud-6.1.spec.ts` — 4 passed, including C91
- `gh pr checks 20 --watch` on commit `09bbbd0` — Phase 0–9 gate fail. Runs `36366409457` (33m13s) and `36366412561`. Failed step: Verify Phase 10.

## Not done / blocked

Exact error from both runs, step Verify Phase 10. `scripts/verify-phase-10.mjs` spawns `npm run start` (`next start --port 3000`) and then `waitForHttpOk` on `http://127.0.0.1:3099/cockpit`. The wait throws, and `fail()` sets `process.exitCode = 1`. The script still runs the advisory smoke and `cockpit-ops-10.spec.ts` (1 passed), then the step exits 1. There is no `[verify:phase-10] OK`.

```
[verify:phase-10] C122: web server not ready for perf-smoke/e2e: Timed out waiting for http://127.0.0.1:3099/cockpit
##[error]Process completed with exit code 1.
```

`scripts/verify-phase-10.mjs` is outside the approved paths (phase 5–9, hotfix-p8, the copied Instagram checks, and the single C91 line). Stopped for Planner approval.

## Laptop follow-up

- Planner decides how phase 10 should start Next on `PLAYWRIGHT_PORT` (3099). `apps/web/package.json` `start` still pins port 3000 for the laptop demo.
- Port fix, compose guard, C30/C50/C59/C70/C78, and the C91 exact phase label are already on this branch.
- Planner merges first; wave-1 branches (C1, C3, C6) are cut after this merge.
- Planner updates QUEUE, AGENT_LOG, and CURRENT_STATE.
