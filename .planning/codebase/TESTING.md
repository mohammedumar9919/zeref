# TESTING — Zeref

---

## Verify chain (primary gate)

| Script | Scope |
|--------|-------|
| `npm run verify:phase-0` | Scaffold paths, contracts smoke |
| `npm run verify:phase-1` | DB migrations, phase-1 contracts |
| `npm run verify:phase-2` | Collect, merge, worker registry (partial) |
| `npm run verify:phase-3` | Normalize, embed |
| `npm run verify-4` | Analyze, report |
| `npm run verify:phase-5` | Web build, Playwright cockpit |

Run cumulative: `scripts/phase_gate.ps1 -Phase N` (when committed)

---

## Unit / integration tests

| Package | Runner | Location |
|---------|--------|----------|
| `@zeref/contracts` | node:test | `packages/contracts/test/` |
| `@zeref/db` | node:test | `packages/db/test/` (needs DATABASE_URL) |
| `@zeref/worker` | node:test | `apps/worker/test/` |
| `@zeref/instagram` | node:test | `packages/instagram/test/` |
| `@zeref/web` | Playwright | `apps/web/tests/e2e/` |

---

## CI env (`.github/workflows/ci.yml`)

```text
DATABASE_URL=postgres://zeref:zeref@localhost:5432/zeref
ZEREF_LLM_MOCK=1
ZEREF_BFF_FIXTURE=1   # Phase 5 only
```

---

## Local dev

```powershell
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
npm run verify:phase-1
```

---

## Gaps

- No worker daemon integration test (enqueue → consumer)
- Phase 5 CI never tests BFF with live DB + seeded artifacts
- No perf test for globe after 5.1 point-cloud
- No voice mock tests until Phase 6

---

## TDD policy

Use Superpowers `test-driven-development` for new features. Contract changes require fixture updates in `fixtures/phase-N/`.
