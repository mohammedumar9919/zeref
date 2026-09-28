# CLOUD-C0 — CI green (gate)

- Agent: grok-cloud
- Branch: cloud/c0-ci-green
- PR: https://github.com/mohammedumar9919/zeref/pull/20
- Status: blocked

## Done

- Playwright webServer timeout (main run `36353883691`, step Verify Phase 5): readiness is `http://127.0.0.1:${PLAYWRIGHT_PORT}/cockpit` (default 3099) while `npm run start` is `next start --port 3000`. The webServer command is now `npx --no-install next start --hostname 127.0.0.1 --port ${PORT}`.
- `packages/db/test/migrations.test.mjs` does not spawn `docker compose up` when `DATABASE_URL` is set or `CI` is `true`/`1`.
- C30 in `scripts/verify-phase-5.mjs` now follows the jarvis-kernel shape. `@zeref/instagram` is allowed only in server-only modules under `apps/web/lib/jarvis/**` and `apps/web/lib/ops/**`. It stays blocked under `apps/web/app/**`, `apps/web/components/**`, every other web path, and any file marked `use client`. ADR-018 records that this rule was amended on 2026-09-27 because of the Track B Graph work. The four `apps/web/lib` files were not edited. Verify Phase 5 on run `36364706756` printed `[verify:phase-5] OK`.

## Tests

- `npm ci`, `npm run build`, `npm run lint` — pass (earlier on this branch)
- `npm test -w @zeref/db` — pass (5 guard tests; migration suite skipped without `DATABASE_URL`)
- Local `CI=true` `node scripts/verify-phase-5.mjs` — exit 0, `[verify:phase-5] OK` (15 passed, 2 flaky retries, 41 skipped)
- `gh pr checks 20 --watch` — Phase 0–9 gate fail. Runs `36364702330` (6m21s) and `36364706756` (7m51s). Phase 5 passed. Phase 5.1 exited 1.

## Not done / blocked

Exact error from Verify Phase 5.1 in run `36364706756` (same four modules; `fail()` sets `process.exitCode` and the script still chains phases 0–5, which pass, then the step exits 1):

```
[verify:phase-5.1] C50: apps/web/lib/jarvis/competitor-discovery.ts must not import @zeref/instagram
[verify:phase-5.1] C50: apps/web/lib/jarvis/instagram-snapshot.ts must not import @zeref/instagram
[verify:phase-5.1] C50: apps/web/lib/ops/facebook-health.ts must not import @zeref/instagram
[verify:phase-5.1] C50: apps/web/lib/ops/instagram-health.ts must not import @zeref/instagram
```

C50 lives in `scripts/verify-phase-5.1.mjs`. The approved extension covers the C30 check in `scripts/verify-phase-5.mjs` and the C30 line in ADR-018 only. C50, C59, C70, and C78 were not changed. Stopped for Planner approval.

## Laptop follow-up

- Planner decides whether C50 (and the later C59 / C70 / C78 copies) should follow the amended C30 rule. Do not skip those assertions.
- After that, re-run the Phase 0–9 gate. The Playwright port fix, compose guard, and C30 amendment are already on this branch.
- Planner merges first; wave-1 branches (C1, C3, C6) are cut after this merge.
- Planner updates QUEUE, AGENT_LOG, and CURRENT_STATE.
