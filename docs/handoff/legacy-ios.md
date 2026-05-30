# Legacy iOS salvage notes (instagram-ops-studio) — rewrite-only

**Reference repo (read-only):** `c:\Projects\instagram-ops-studio`  
**Rule:** Capture lessons and patterns to **rewrite** in Zeref with tests. **Do not copy code.**

## Why this exists

The legacy project shipped a usable Jarvis cockpit but suffered from docs drift, re-scrape loops, stub workers, and weak CI. Zeref Phase 0–1 hardened governance; **Phase 2** rewrites Instagram **collect** with immutable snapshots and explicit merge semantics.

---

## Merge-by-shortcode (Phase 2 salvage)

### What legacy did well

Legacy `mergePostsByShortcode` in `apps/job-runner/src/jarvis.ts` is the reference behavior for combining Graph and scrape views of the **same post**:

| Behavior | Legacy | Zeref (ADR-004) |
|----------|--------|-----------------|
| Map key | `shortcode` or `url` | `shortcode` from scrape; Graph via `permalink` regex `/(p\|reel)\/([^/?#]+)/` |
| One row per post | `Map` by key | `mergeByShortcode` → one `MergedInstagramPostPayload` per shortcode |
| Graph over scrape for counts | `likes`, `comments`, `caption` from Graph when both | Same — Graph wins engagement text |
| Scrape keeps media | `thumbnailUrl`, `videoUrl`, `carouselUrls` preserved when Graph merges | Same — scrape media not overwritten by Graph `media_url` |
| Graph-only / scrape-only | Valid single-source row | `sources: ['graph']` or `['scrape']` |

**Salvage:** Port the **merge precedence rules**, not the flattened `PublicProfilePost` storage shape.

### What legacy did wrong (do not repeat)

| Pitfall | Legacy symptom | Zeref rule |
|---------|----------------|------------|
| **Flattened storage** | Merged post lost Graph vs scrape provenance | Store `MergedInstagramPostPayload` with `graph?`, `scrape?`, `sources[]` on snapshot (Q1) |
| **Dual snapshot rows** | Docs implied separate scrape/graph rows | One `instagram_post_raw` row per shortcode (Q1) |
| **Re-scrape per stage** | `loadAccountContext()` scraped again in enrich/synthesize | Collect once; downstream uses snapshot IDs only (C6) |
| **Merge inside monolith job** | `jarvis_analyze` did scrape+merge+LLM in one worker | Collect is a separate job type; merge runs only in collect (C9) |
| **Field name typos** | `competitorBenchmarks` vs `competitorBenchmark` emptied UI | Single `@zeref/contracts` source of truth |

### Rewrite checklist (Phase 2)

- [x] `mergeByShortcode` in `@zeref/instagram` with unit tests
- [x] Frozen HTML fixtures (`fixtures/phase-2/html/`)
- [x] Graph mock fixtures (`fixtures/phase-2/graph/`)
- [x] Worker collect INSERT + C8 dedupe (ADR-005)
- [x] Normalize/embed read merged snapshot by ID (Phase 3)
- [x] Analyze/report read normalized/metric rows by ID (Phase 4)

---

## Elite report shape (Phase 4 salvage)

### What legacy did well

Legacy `jarvis_analyze` / report synthesis produced structured sections (headline, engagement, niche, recommendations) plus narrative prose. Zeref **rewrites** this as `phase4-elite-v1` JSON in `@zeref/reports` with **numeric citations** tied to `metric_facts` (`[mf:uuid]` markers).

| Behavior | Legacy | Zeref (Phase 4) |
|----------|--------|-----------------|
| Structured + narrative | Combined in one LLM blob | `elite` JSON deterministic; narrative via OpenRouter (mocked in CI) |
| Benchmarks | Sometimes invented when thin | `insufficient_data` honest pathways |
| Citations | Informal | `citationIndex` + verify lint (C20) |
| Dual outputs | Jarvis brief + long report | `elite` required (C23) + optional `jarvis_brief` row |

**Salvage:** Section taxonomy and ops tone — **not** prompt strings or JSON field names from ios.

### Elite legacy files to read (not copy)

| Path | Why |
|------|-----|
| `apps/job-runner/src/jarvis.ts` — analyze/synthesize | Section ideas for elite builder |
| Report / synthesis routes in legacy API | Citation and insufficient-data UX patterns |

### Merge legacy files to read (not copy)

| Path | Why |
|------|-----|
| `apps/job-runner/src/jarvis.ts` — `mergePostsByShortcode`, `graphMediaToPosts` | Merge precedence reference |
| `packages/ig-runner/` | Scrape HTML patterns (rewrite with fixture tests) |
| `docs/handoff/03-failures-fixes-verification.md` | Windows ESM, stale `.next`, BFF double-proxy |
| `docs/handoff/07-product-goals-and-end-features.md` | Cockpit acceptance (Phase 5+) |

---

## Cockpit salvage (Phase 5)

Legacy shipped a **demo-grade Jarvis cockpit** (`DashboardCockpit.tsx`, orb, asymmetric panels, voice PTT). Zeref Phase 5 rewrites the **layout shell** with RSC-first data and CI-enforced Playwright — **no code copy**.

### What legacy did well

| Behavior | Legacy | Zeref (Phase 5) |
|----------|--------|-----------------|
| Primary command screen | `/dashboard` one-screen cockpit | `/cockpit` default; `/` redirects (ADR-017) |
| Minimal top nav | 3 links (Home, Dashboard, Settings) | **2 links:** Cockpit \| Settings (C25) |
| Asymmetric panels | Studio, Reports, Top content, Competitors | Studio + Calendar \| Globe \| Reports + Research (C26) |
| Center orb / globe | Three.js on dashboard only | Client island in center column; ≤50k tris (ADR-015) |
| BFF-only browser API | `/api/control` route handler | `/api/v1/cockpit/slices` in `apps/web` (ADR-016) |
| Elite report in UI | Reports panel + deep link | Summary DTO in slices; detail by artifact ID (C29) |
| Honest empty states | `insufficient_data` when scrape thin | `insufficientData` on panel DTOs (Q2) |

**Salvage:** Layout IA, BFF discipline, panel density, globe-as-anchor — not legacy component code or 7-link nav sprawl.

### What legacy did wrong (do not repeat)

| Pitfall | Legacy symptom | Zeref rule |
|---------|----------------|------------|
| **Client refetch storm** | `DashboardCockpit` `fetch` slices on mount (`cache: "no-store"`) | RSC `getCockpitSlices()` once per request (C27) |
| **No CockpitDataProvider** | Every nav remount refetched | Server fetch + tagged cache policy (ADR-017) |
| **Playwright optional** | `cockpit-layout.spec.ts` skipped without env | **Required in CI** (C28 / ADR-018) |
| **Double BFF proxy** | Next rewrite + route handler | Single Route Handler path (ADR-016) |
| **Voice on dashboard only** | Partial global voice | **No voice at all** in Phase 5 (C30); Phase 6+ |
| **Globe GPU bloat** | Bloom, always-on animation | Idle rotation only; lazy chunk (ADR-015) |
| **Full elite JSON in slices** | Heavy cockpit hydration | Summary DTO only; detail route (Q2) |
| **Field name typos** | `competitorBenchmarks` emptied panel | `@zeref/contracts` `CockpitSlicesSchema` (C24) |

### Rewrite checklist (Phase 5)

- [ ] Planner approves `phase-5-contract.md` (Q1–Q3, C24–C30)
- [ ] RSC cockpit pages + BFF routes (UI / API agents)
- [ ] `CockpitSlicesSchema` + fixtures (Contracts)
- [ ] Playwright `cockpit-layout` in CI (QA / ADR-018)
- [ ] `npm run verify:phase-5` green — **required before marking done**
- [ ] Jarvis voice wiring — Phase 6 only (C30)

### Legacy cockpit files to read (not copy)

| Path | Why |
|------|-----|
| `apps/approval-web/src/components/cockpit/DashboardCockpit.tsx` | Panel grid + slices fetch anti-pattern |
| `apps/approval-web/src/components/shell/JarvisNav.tsx` | Nav minimalism reference |
| `apps/approval-web/src/components/jarvis/JarvisCanvas.tsx` | Globe perf lessons |
| `apps/approval-web/src/app/api/control/[...path]/route.ts` | BFF-only pattern |
| `docs/handoff/07-product-goals-and-end-features.md` §8–§9 | Acceptance criteria |
| `tests/e2e/cockpit-layout.spec.ts` (legacy) | Layout test ideas — rewrite for Zeref routes |

---

## Broader legacy lessons (all phases)

### Wins worth keeping

- Command-center IA: minimal nav, one primary cockpit, center orb + panels.
- Hybrid voice: tool registry + local intents first; PTT v1.
- BFF-only browser API; no direct control-api from client.
- `dev:clean` + Windows port/process hygiene.

### Failures to design out

- Docs vs code drift — contract-first + verify gates.
- Stub workers — no job type without impl + tests.
- Verification theater — CI runs `verify:phase-N`.
- Re-scrape addiction — snapshot immutability (C6).

---

## Related Zeref docs

- [ADR-015: Globe performance](../governance/adr/ADR-015-globe-performance.md)
- [ADR-016: BFF cockpit slices](../governance/adr/ADR-016-bff-cockpit-slices.md)
- [ADR-017: Cockpit routes](../governance/adr/ADR-017-cockpit-routes-layout.md)
- [Phase 5 contract](../governance/phase-5-contract.md)
- [ADR-004: Instagram merge](../governance/adr/ADR-004-instagram-merge.md)
- [Phase 2 contract](../governance/phase-2-contract.md)
