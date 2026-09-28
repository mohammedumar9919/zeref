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
- `scripts/verify-phase-10.mjs` owned server was `npm run start` (`next start --port 3000`) while C122 waits on `http://127.0.0.1:${PLAYWRIGHT_PORT}/cockpit` (default 3099). The spawn now appends `--hostname 127.0.0.1 --port <PLAYWRIGHT_PORT|PORT|3099>`. Local check: Next printed `Local: http://127.0.0.1:3099` and `GET /cockpit` returned 200. Nothing else in that script changed.

## Tests

- `npm ci`, `npm run build`, `npm run lint` — pass (earlier on this branch)
- `npm test -w @zeref/db` — pass
- Local `CI=true` `node scripts/verify-phase-5.mjs` — exit 0
- Local `ZEREF_PHASE61_UI=1` `npm -w @zeref/web run test:e2e -- e2e/cockpit-hud-6.1.spec.ts` — 4 passed, including C91
- Prior CI on `09bbbd0` failed Verify Phase 10 with `C122: web server not ready for perf-smoke/e2e: Timed out waiting for http://127.0.0.1:3099/cockpit` (runs `36366409457`, `36366412561`).

## Not done / blocked

Phase 10's owned server reached `/cockpit` (run `36369708413`: `[perf-smoke] within C122 target (500ms)`). Verify Phase 10.5 then exited 1. The hard failure, three attempts, is not the port mismatch and not an Instagram import check:

```
Error: expect(locator).toBeVisible() failed
Locator: locator('[data-testid="globe-island"][data-globe-brain-state="memory_saved"]')
Expected: visible
Error: element(s) not found
> 82 |     await expect(globe).toBeVisible();
    at apps/web/e2e/cockpit-stability-10.5.spec.ts:82:25

1 failed
  [chromium] › e2e/cockpit-stability-10.5.spec.ts:32:3 › cockpit stability phase 10.5 (C128) › single EventSource and SSE brain state survive panel navigation
```

Runs `36369711565` (40m16s) and `36369708413` (44m7s). Stopped.

## Laptop follow-up

- `apps/web/package.json` `start` still pins port 3000 for the laptop demo. Phase 10's verify spawn overrides that with `--port`.
- Planner merges first; wave-1 branches (C1, C3, C6) are cut after this merge.
- Planner updates QUEUE, AGENT_LOG, and CURRENT_STATE.

## 2026-09-28 — local remaining steps (no code changes)

CI env, branch `cloud/c0-ci-green`. C128 treated as known. P8 (`npm run verify:hotfix-p8`) exit 0, `[verify:hotfix-p8] OK`. Phase 10.5 exit 1 only on C128 `apps/web/e2e/cockpit-stability-10.5.spec.ts:82`; `[verify:phase-10] OK` before that. Phase 11 exit 1 only because it chains phase 10.5; own checks passed (`[jarvis-eval] OK`, `jarvis-agent-11.spec.ts` 3 passed). Phase 12 exit 1 only because it chains phase 11; own checks passed (`cockpit-data-age-12.spec.ts` 2 passed). No other hard failures.
