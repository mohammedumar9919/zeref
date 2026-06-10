# Dev performance — Zeref web cockpit

**Source:** Superpowers `systematic-debugging` on `/cockpit` latency (2026-05-30).

---

## Expected behavior (not bugs)

| Scenario | Typical time | Cause |
|----------|--------------|-------|
| First `/cockpit` after `dev:clean` or cold `next dev` | ~20–30s | Next.js dev compile (~889 modules incl. dynamic `GlobeCanvas` + three.js) |
| First `/api/v1/cockpit/slices` cold | ~9–10s | ~451 module compile |
| Warm `/cockpit` | ~350–500ms | Normal |
| Warm `/settings` cold | ~2–4s | Smaller graph |

**Prod-like measurement** (not dev compile) — use for Operator UAT and perf smoke (C121–C122):

```powershell
cd c:\Projects\zeref
npm run build
npm run start -w @zeref/web
# then hit http://localhost:3000/cockpit
```

Equivalent: `next build && next start` in `apps/web` (port 3000 by default).

---

## Operator UAT (Phase 10 — C121)

When judging whether the cockpit feels **instant** or **slow**, use **production build**, not `next dev`:

| Mode | Use for |
|------|---------|
| `next build && next start` | Operator UAT, perf smoke (C122), “does nav feel fast?” |
| `next dev` / `dev:stack` | Feature work, pipeline + worker integration |

**Do not** file Phase 10 perf regressions based on first-hit dev compile (~20–30s cold `/cockpit`). That is expected Turbopack/webpack behavior ([Expected behavior](#expected-behavior-not-bugs)).

For full stack ops UAT (worker + honest pipeline SSE), prefer:

```powershell
cd c:\Projects\zeref
npm run dev:stack   # db + worker + web; ZEREF_WORKER_AVAILABLE=1 on web (P10-A)
```

Web-only quick UI check remains valid with `npm run dev -w @zeref/web` — but no queue consumer and simulated pipeline only.

---

## Corrupted `.next` (real incident pattern)

**Symptoms:**

- HTTP 500 on `/cockpit` or `/api/v1/cockpit/slices` for 30–80+ seconds
- Log: `ENOENT: prerender-manifest.json`
- Log: `Cannot find module './383.js'`
- Log: `webpack.cache.PackFileCacheStrategy ... rename ... ENOENT`

**Cause:** Requests served while `next dev` is mid-recompile (e.g. running `verify:phase-5` / Playwright burst during hot reload).

**Recovery:**

```powershell
cd c:\Projects\zeref
npm run dev:clean          # removes .next + kills port 3000 on Windows
npm run dev -w @zeref/web  # fresh dev server
```

**Prevention:**

- Do **not** hammer verify/Playwright while dev server is recompiling
- Use `npm run dev:clean` before reporting perf regressions
- Prefer `phase_gate.ps1` in a **stable** dev session or use `next build && next start` for timing

---

## RSC BFF path (Phase 5.0.2+)

Before 5.0.2, `getCockpitSlices()` in `bff.ts` did an HTTP loopback to `/api/v1/cockpit/slices` (~600ms overhead when warm).

After 5.0.2: RSC calls `loadCockpitSlices()` directly; HTTP route remains for Playwright and external clients.

---

## Playwright port 3099 (`EADDRINUSE`)

**Symptoms:**

- `http://127.0.0.1:3099/cockpit is already used` during `verify:phase-5` or `verify:phase-5.1`
- Often after a prior verify run left `next start` running, or dev server on wrong port

**Recovery:**

```powershell
# Find and kill process on 3099 (Windows)
Get-NetTCPConnection -LocalPort 3099 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

**Prevention:**

- `verify:phase-5.1` does **not** start a second Playwright server — C48 runs inside the `verify:phase-5` chain
- `verify:phase-5` sets `ZEREF_PLAYWRIGHT_REUSE=1` **after** the first full Playwright run so nested phases (6→8) reuse the same fixture server
- Playwright only reuses when `ZEREF_PLAYWRIGHT_REUSE=1` (not automatic in CI). The webServer always injects `ZEREF_BFF_FIXTURE=1` when it **does** start.
- **Do not** set `ZEREF_PLAYWRIGHT_REUSE=1` before `verify:phase-5` unless port 3099 was started by a prior verify run with fixture mocks — stale servers cause mass e2e failures (404 / missing globe).
- For manual re-runs after a good verify: `$env:ZEREF_PLAYWRIGHT_REUSE='1'` is OK. Otherwise kill 3099 first (see above).

---

## Related

- [failures-checklist.md](./failures-checklist.md) — stale `.next` rule
- [CI_SETUP.md](./CI_SETUP.md) — verify env
- [legacy-ios.md](./handoff/legacy-ios.md) — `dev:clean` pattern
