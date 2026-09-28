# CLOUD-C0 — CI green (gate)

- Agent: grok-cloud
- Branch: cloud/c0-ci-green
- PR: https://github.com/mohammedumar9919/zeref/pull/20
- Status: pr_ready

## Done

- Playwright webServer timeout (main run `36353883691`, step Verify Phase 5): readiness is `http://127.0.0.1:${PLAYWRIGHT_PORT}/cockpit` (default 3099) while `npm run start` is `next start --port 3000`. The webServer command is now `npx --no-install next start --hostname 127.0.0.1 --port ${PORT}`.
- `packages/db/test/migrations.test.mjs` does not spawn `docker compose up` when `DATABASE_URL` is set or `CI` is `true`/`1`.
- C30 in `scripts/verify-phase-5.mjs` now follows the jarvis-kernel shape. `@zeref/instagram` is allowed only in server-only modules under `apps/web/lib/jarvis/**` and `apps/web/lib/ops/**`. It stays blocked under `apps/web/app/**`, `apps/web/components/**`, every other web path, and any file marked `use client`. ADR-018 records that this rule was amended on 2026-09-27 because of the Track B Graph work. The four `apps/web/lib` files were not edited.

## Tests

- `npm ci`, `npm run build`, `npm run lint` — pass (prior commit on this branch)
- `npm test -w @zeref/db` — pass (5 guard tests; migration suite skipped without `DATABASE_URL`)
- `CI=true` fixture env, phase flags unset: `node scripts/verify-phase-5.mjs` — exit 0, `[verify:phase-5] OK`. Playwright: 15 passed, 2 flaky (retry then pass), 41 skipped. No C30 lines.

## Not done / blocked

- None in the approved paths. Later verify scripts still have their own instagram guards (C50, C59, C70, C78). Those assertions were not changed.

## Laptop follow-up

- Planner merges first; wave-1 branches (C1, C3, C6) are cut after this merge.
- Planner updates QUEUE, AGENT_LOG, and CURRENT_STATE.
