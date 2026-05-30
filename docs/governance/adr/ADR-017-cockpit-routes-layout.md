# ADR-017: Cockpit routes and responsive layout

**Status:** Accepted (Phase 5)  
**Date:** 2026-05-29  
**Owner:** UI  
**Related:** [Phase 5 contract](../phase-5-contract.md) (Q3, C25–C26) · [ADR index](./README.md) · [ADR-015](./ADR-015-globe-performance.md) · [ADR-016](./ADR-016-bff-cockpit-slices.md) · [ADR-018](./ADR-018-verify-phase-5-harness.md) · [Legacy cockpit salvage](../../handoff/legacy-ios.md) · [verify.md](../verify.md)

## Context

Phase 5 ships the cockpit **shell**: four panels, center globe, minimal navigation. Deep links must focus individual panels without adding sub-nav items (C25).

## Decision

### Routes

| Route | Behavior |
|-------|----------|
| `/` | Redirect to `/cockpit` |
| `/cockpit` | All four panels visible |
| `/cockpit/studio` | Cockpit grid; Studio panel focused (`ring` highlight) |
| `/cockpit/calendar` | Calendar panel focused |
| `/cockpit/reports` | Reports panel focused; optional `?artifact=<uuid>` hint for detail BFF |
| `/cockpit/research` | Research panel focused |
| `/settings` | Health/version panel only (no TTS toggles until Phase 6) |

**Top nav:** `Cockpit | Settings` only — no Studio/Calendar/Reports/Research nav entries.

### Layout grid (C26)

**Desktop (`lg`, ≥1024px):** CSS grid with three columns:

```
[ left stack  ] [ globe column ] [ right stack ]
  Studio                         Reports
  Calendar                       Research
```

- Left column: Studio + Calendar stacked.
- Center: Globe island (`minmax(280px, 420px)`).
- Right column: Reports + Research stacked.

**Tablet / mobile (<1024px):** Single column, order:

1. Globe island (primary visual anchor)
2. Left stack (Studio, Calendar)
3. Right stack (Reports, Research)

### Data loading (C27)

- All cockpit pages are **React Server Components** that call `getCockpitSlices()` once per request.
- Deep-link pages reuse the same grid; `focus` prop highlights the active panel.
- No client-side `useEffect` refetch for panel summaries.

## Consequences

- Playwright layout tests target stable `data-testid` regions (see `docs/design/DESIGN_SYSTEM.md`).
- BFF URL consumed as `GET /api/v1/cockpit/slices` (implementation in API agent / ADR-016).
- Panel deep links are bookmarkable but do not change nav chrome.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Separate full-page layouts per panel | Breaks wireframe “all panels visible” default |
| Sub-nav for panels | Violates C25 minimal nav |
| Client-side SWR for slices | Conflicts with RSC-first master plan §1 |

## Verification

```powershell
cd c:\Projects\zeref
$env:ZEREF_BFF_FIXTURE='1'
npm -w @zeref/web run test:e2e
```

Layout regions and nav assertions run in `npm run verify:phase-5` (ADR-018).
