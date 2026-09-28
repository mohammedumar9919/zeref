# CLOUD-C0 — CI green (gate)

- Agent: grok-cloud
- Branch: cloud/c0-ci-green
- PR: https://github.com/mohammedumar9919/zeref/pull/20
- Status: blocked

## Done

- Playwright webServer timeout (main run `36353883691`, step Verify Phase 5): readiness is `http://127.0.0.1:${PLAYWRIGHT_PORT}/cockpit` (default 3099) while `npm run start` is `next start --port 3000`. The webServer command is now `npx --no-install next start --hostname 127.0.0.1 --port ${PORT}`.
- `packages/db/test/migrations.test.mjs` does not spawn `docker compose up` when `DATABASE_URL` is set or `CI` is `true`/`1`.
- The copied `@zeref/instagram` web import check now follows the jarvis-kernel shape in C30, C50, C59, C70, and C78. The import is allowed only in server-only modules under `apps/web/lib/jarvis/**` and `apps/web/lib/ops/**`. It stays blocked under `apps/web/app/**`, `apps/web/components/**`, any file marked `use client`, and every other `apps/web` path. ADR-018 notes the C30 rule was amended on 2026-09-27 because of the Track B Graph work, and that the same amendment applies to C50, C59, C70, and C78. The four `apps/web/lib` files were not edited. C14 and C19 were not changed.
- After that amendment, Verify Phase 5 and the C50/C59/C70/C78 guards no longer fail the gate. Run `36365429605` reached Verify Phase 6.1.

## Tests

- `npm ci`, `npm run build`, `npm run lint` — pass (earlier on this branch)
- `npm test -w @zeref/db` — pass (5 guard tests; migration suite skipped without `DATABASE_URL`)
- Local `CI=true` `node scripts/verify-phase-5.mjs` — exit 0, `[verify:phase-5] OK`
- `node --check` on the amended verify scripts — pass
- `gh pr checks 20 --watch` on commit `ca13dd3` — Phase 0–9 gate fail. Runs `36365427336` (7m37s) and `36365429605` (9m32s). Failed step: Verify Phase 6.1.

## Not done / blocked

Exact error from run `36365429605`, step Verify Phase 6.1. `ZEREF_PHASE61_UI=1` makes `e2e/cockpit-hud-6.1.spec.ts` run inside the chained `verify:phase-5` Playwright suite. C91 failed all 3 attempts. C92–C94 passed. One layout test was flaky (strict-mode duplicate `cockpit-grid`) and passed on retry; it is not the hard failure.

```
Error: expect(locator).toBeVisible() failed
Locator: getByTestId('hud-header').getByText('Phase 6.1')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
  at apps/web/e2e/cockpit-hud-6.1.spec.ts:36:49

1 failed
  [chromium] › e2e/cockpit-hud-6.1.spec.ts:29:3 › cockpit HUD phase 6.1 (C91–C94) › C91 — hud header status chips (mono labels, cyan accent)
[verify:phase-5] Command failed: npm -w @zeref/web run test:e2e
[verify:phase-5.1] Command failed: npm run verify:phase-5
[verify:phase-6.1] Command failed: npm run verify:phase-5.1
```

This is a product assertion in `apps/web/e2e`, not the copied Instagram check and not server-start / port / compose logic. The spec and the HUD markup are outside the approved paths. Stopped for Planner approval.

## Laptop follow-up

- Planner decides how C91 should find the text `Phase 6.1` in `hud-header` (UI copy vs the spec). Do not skip the test.
- Port fix, compose guard, and C30/C50/C59/C70/C78 amendments are already on this branch.
- Planner merges first; wave-1 branches (C1, C3, C6) are cut after this merge.
- Planner updates QUEUE, AGENT_LOG, and CURRENT_STATE.
