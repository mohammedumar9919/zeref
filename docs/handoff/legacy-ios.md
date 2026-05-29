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
- [ ] Normalize/analyze/report read merged snapshot by ID (Phase 3+)

### Legacy files to read (not copy)

| Path | Why |
|------|-----|
| `apps/job-runner/src/jarvis.ts` — `mergePostsByShortcode`, `graphMediaToPosts` | Merge precedence reference |
| `packages/ig-runner/` | Scrape HTML patterns (rewrite with fixture tests) |
| `docs/handoff/03-failures-fixes-verification.md` | Windows ESM, stale `.next`, BFF double-proxy |
| `docs/handoff/07-product-goals-and-end-features.md` | Cockpit acceptance (Phase 5+) |

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

- [ADR-004: Instagram merge](../governance/adr/ADR-004-instagram-merge.md)
- [Phase 2 contract](../governance/phase-2-contract.md)
- [ADR-001: Snapshot data model](../governance/adr/ADR-001-snapshot-data-model.md)
