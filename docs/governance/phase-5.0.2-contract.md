# Phase 5.0.2 contract — Dev hygiene + BFF loopback

**Status:** APPROVED (Planner, 2026-05-30)  
**Depends on:** Phase 5.0.1  
**Blocks:** Phase 5.1 (recommended clean baseline)

---

## Goal

Close Superpowers systematic-debugging findings: hardened dev recovery, documented dev vs prod perf, eliminate RSC HTTP loopback to own BFF.

---

## Q1 — Dev clean

| Decision | Choice |
|----------|--------|
| Cache wipe | `apps/web/.next`, `apps/web/node_modules/.cache` |
| Port hygiene | Kill process on port 3000 (Windows PowerShell helper) |
| npm script | `npm run dev:clean` unchanged entrypoint |

## Q2 — Dev performance docs

| Deliverable | Path |
|-------------|------|
| Symptom table | `docs/DEV_PERFORMANCE.md` |
| failures-checklist update | Corrupted `.next` symptoms + recovery |

## Q3 — BFF RSC direct call

| Decision | Choice |
|----------|--------|
| RSC | `getCockpitSlices()` → `loadCockpitSlices()` direct import |
| HTTP route | Unchanged `GET /api/v1/cockpit/slices` for Playwright/clients |
| ADR | Amend ADR-016 |

---

## Acceptance (C35–C38)

| ID | Criterion |
|----|-----------|
| C35 | `npm run dev:clean` removes `.next` and frees port 3000 on Windows |
| C36 | `docs/DEV_PERFORMANCE.md` documents cold compile vs corrupted cache |
| C37 | `getCockpitSlices()` no longer uses `fetch` to localhost |
| C38 | Web tests pass; `verify:phase-5` green with fixture env |

---

## Verify

```powershell
npm run build
npm -w @zeref/web test
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_LLM_MOCK='1'
npm run verify:phase-5
```

---

## Out of scope

- Luke HUD visual (5.1)
- Shrinking three.js dev module graph
- CI live DB BFF (ZR-005)
