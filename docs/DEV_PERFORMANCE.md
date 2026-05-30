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

**Prod-like measurement** (not dev compile):

```powershell
cd c:\Projects\zeref
npm run build
npm run start -w @zeref/web
# then hit http://localhost:3000/cockpit
```

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

## Related

- [failures-checklist.md](./failures-checklist.md) — stale `.next` rule
- [CI_SETUP.md](./CI_SETUP.md) — verify env
- [legacy-ios.md](./handoff/legacy-ios.md) — `dev:clean` pattern
