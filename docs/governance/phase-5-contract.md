# Zeref — Phase 5 Contract (Discuss + Contract)

**Phase:** 5  
**Status:** **IMPLEMENTATION COMPLETE** (Planner sign-off pending)  
**Theme:** Cockpit UI shell (4 panels + center globe, RSC-first, BFF)

**Prerequisites:** Phases 0–4 approved (`verify:phase-4` green; tip `dc2adb1`).  
**Implementation tip:** `272a71c` (`9e75113` UI, `bf09fd5` API, `272a71c` Docs/QA harness docs).

---

## Open questions for Planner (with orchestrator recommendations)

| # | Question | Recommendation |
|---|----------|----------------|
| **Q1** | Globe performance budget | **Client-only** Three.js/R3F globe; **≤50k triangles** for base mesh; **lazy-load** globe chunk; target **≥30fps** on CI headless smoke (layout only) and **≥45fps** dev guideline on mid laptop. No physics sim in Phase 5. **ADR-015**. |
| **Q2** | Cockpit slices BFF shape | **`GET /api/v1/cockpit/slices`** returns `{ schemaVersion, panels: { studio, calendar, reports, research } }` where each panel is a **summary DTO** (IDs, titles, `insufficientData`, timestamps) — not full elite JSON blobs. Detail fetch: **`GET /api/v1/reports/artifacts/:id`**. **ADR-016**. |
| **Q3** | Panel deep-link routes | **Default** `/cockpit` (all panels visible). Deep links: `/cockpit/studio`, `/cockpit/calendar`, `/cockpit/reports`, `/cockpit/research`; **Settings** at `/settings` only. Nav remains **Cockpit \| Settings** (no sub-nav for panels). **ADR-017**. |

### Proposed conditions (C24–C30)

| ID | Condition |
|----|-----------|
| **C24** | Export **`PHASE5_CONTRACT_VERSION`** and **`CockpitSlicesSchema`** (Zod) in `@zeref/contracts`. |
| **C25** | Top nav: **`Cockpit` \| `Settings` only** — no extra top-level routes in Phase 5. |
| **C26** | Cockpit layout: **Studio + Calendar (left)** · **thick center globe** · **Reports + Research (right)** — responsive collapse rules documented in ADR-017. |
| **C27** | **RSC-first** data loading for panel summaries; **client state only** for globe interaction; BFF under **`/api/v1`** in `apps/web` (Next Route Handlers) or `apps/api` proxy — single documented choice in ADR-016. |
| **C28** | **`npm run verify:phase-5`** runs **Playwright cockpit-layout** tests; **required in CI** (Phase 0–5 gate). |
| **C29** | Reports panel renders **elite artifact summary** from DB/BFF by ID — read-only; no new report generation in UI. |
| **C30** | **No Jarvis voice**, STT, TTS, PTT, or Realtime API in Phase 5 (Phase 6+). |

**Data agent:** SKIP unless Planner requires a read-only SQL view (default: BFF queries existing tables).

---

## Goals

1. **Next.js 15 Cockpit app** in `apps/web` — App Router, React 19, dark command-center aesthetic (`docs/design/DESIGN_SYSTEM.md` created in Phase 5).
2. **Layout shell** — 4 panels + center globe (Three.js/R3F), matches master plan wireframe.
3. **BFF `/api/v1`** — cockpit slices + report artifact detail endpoints backed by Postgres read-only queries (no workers invoked from UI).
4. **RSC-first** — panel summaries fetched on server; tagged cache or `revalidate` policy documented; avoid client refetch storms (master plan §1).
5. **Contracts** — `CockpitSlicesSchema`, panel DTOs, `PHASE5_CONTRACT_VERSION`.
6. **`npm run verify:phase-5`** — build, contract tests, **Playwright layout smoke in CI** (C28).
7. **CI** — extend to **Phase 0–5 gate** (C28).

---

## Non-goals (out of scope)

| Area | Notes |
|------|--------|
| Jarvis voice / STT / TTS / PTT | Phase 6 |
| Full duplex / Realtime API | Phase 6+ |
| Report **generation** from UI | Worker jobs only (Phase 4) |
| Instagram collect/scrape changes | Bugfix only |
| WebAuthn / enforced auth | Phase 10 |
| Studio editor / Calendar scheduling UX | Phase 8 (shell placeholders OK) |
| Research trend pipelines | Phase 9 (placeholder panel OK) |
| `@zeref/instagram` imports in web/api | Forbidden (read DB/BFF only) |

---

## Cockpit layout (binding wireframe)

```
┌──────────────────────────────────────────────────────────────────┐
│  Cockpit                                          Settings       │
├─────────────────┬──────────────────────────┬─────────────────────┤
│  Studio         │                          │  Reports            │
│  Calendar       │   THICK GLOBE (Three.js) │  Research           │
│  (left stack)   │   client island          │  (right stack)      │
└─────────────────┴──────────────────────────┴─────────────────────┘
```

- **Default route:** `/cockpit` (redirect from `/`).
- **Settings route:** `/settings` — health/version panel only in Phase 5 (no TTS toggles until Phase 6).

---

## Panel responsibilities (Phase 5 minimum)

| Panel | Phase 5 behavior |
|-------|------------------|
| **Studio** | Placeholder + link to latest `normalized_entities` / snapshot IDs via slices DTO |
| **Calendar** | Placeholder schedule shell (static fixture or empty state) |
| **Reports** | List elite `report_artifacts` summaries; detail view fetches artifact JSON by ID |
| **Research** | Placeholder + `insufficient_data` honest empty state |
| **Globe** | Visual shell; optional idle animation; **no** voice wiring |

---

## BFF API (proposed — Q2)

### `GET /api/v1/cockpit/slices`

Returns panel summaries for RSC pages.

```json
{
  "schemaVersion": "phase5-cockpit-v1",
  "panels": {
    "studio": { "items": [], "insufficientData": false },
    "calendar": { "items": [], "insufficientData": false },
    "reports": {
      "items": [{ "artifactId": "uuid", "kind": "elite", "headline": "...", "createdAt": "ISO" }],
      "insufficientData": false
    },
    "research": { "items": [], "insufficientData": true }
  }
}
```

### `GET /api/v1/reports/artifacts/:id`

Returns validated `EliteReportSchema` JSON for Reports panel detail (read-only).

**Rules:**

- Handlers query DB by ID; **no** enqueue of worker jobs from BFF.
- **No** `@zeref/instagram` import in `apps/web` or BFF modules (C19-style guard in verify:phase-5).

---

## Web app structure (implementation guide — post-approval)

```
apps/web/
├── app/
│   ├── layout.tsx          # top nav Cockpit | Settings
│   ├── cockpit/
│   │   ├── page.tsx        # RSC shell + 4 panels + globe slot
│   │   ├── studio/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── reports/page.tsx
│   │   └── research/page.tsx
│   ├── settings/page.tsx
│   └── api/v1/             # Route Handlers (if BFF in web per ADR-016)
├── components/
│   ├── cockpit/            # Panel shells
│   └── globe/              # client-only Three.js island
└── e2e/                    # Playwright (also run from verify:phase-5)
```

---

## Verify: `npm run verify:phase-5`

| Check | Requirement |
|-------|-------------|
| Contract + ADRs | phase-5-contract, ADR-015–017 |
| Build | `npm run build` includes `@zeref/web` Next build |
| C24 | `PHASE5_CONTRACT_VERSION` + `CockpitSlicesSchema` exports |
| C25–C26 | Playwright asserts nav + 4 panel regions + globe canvas present |
| C27 | Static check: panel data paths use RSC/server fetch patterns (documented grep or test) |
| C28 | **Playwright runs in CI** (headless chromium) |
| C29 | Reports panel test uses fixture artifact or seeded DB row |
| C30 | No voice/whisper imports in web |
| Prior | `verify:phase-0` … `verify:phase-4` pass |

**CI:** rename job to **Phase 0–5 gate**; add `verify:phase-5` after phase-4.

---

## ADRs

Index: [docs/governance/adr/README.md](./adr/README.md) · Legacy cockpit: [legacy-ios.md](../handoff/legacy-ios.md)

| ADR | Owner | Topic |
|-----|-------|--------|
| [ADR-015](./adr/ADR-015-globe-performance.md) | UI | Globe perf budget, client island (Q1) |
| [ADR-016](./adr/ADR-016-bff-cockpit-slices.md) | API | BFF placement, slices + artifact routes (Q2) |
| [ADR-017](./adr/ADR-017-cockpit-routes-layout.md) | UI | Routes, responsive panel grid (Q3) |
| [ADR-018](./adr/ADR-018-verify-phase-5-harness.md) | QA | Playwright cockpit-layout harness (C28) |

---

## Acceptance criteria

- Planner approves Q1–Q3 and C24–C30.
- Playwright cockpit-layout tests pass locally and in CI.
- Cockpit renders with RSC-fetched slices; globe is client island only.
- `verify:phase-0` through `verify:phase-5` green.
- No Jarvis voice, STT, TTS, or report worker triggers from UI.

---

## Agent ownership (after approval — separate chats required)

| Agent | Deliverables |
|-------|----------------|
| **UI** | Next.js 15 app, layout, panels, globe, DESIGN_SYSTEM.md, RSC pages |
| **API** | `/api/v1` BFF routes, DB reads, ADR-016 |
| **Contracts** | `CockpitSlicesSchema`, `PHASE5_CONTRACT_VERSION`, fixtures |
| **QA** | `verify-phase-5.mjs`, Playwright, CI Phase 0–5 gate, ADR-018 |
| **Docs** | ADR index, verify.md Phase 5, legacy-ios cockpit notes, STATE |
| **Data** | Only if Planner requires SQL views |

**Orchestrator:** integrate agent reports only after user pastes them back; no domain code in orchestrator chat.
