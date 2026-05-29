# ADR-004: Instagram merge-by-shortcode (Phase 2 collect)

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** Scrape agent (+ API/Contracts for Zod alignment)  
**Phase:** 2  
**Related:** [Phase 2 contract](../phase-2-contract.md) (Q1, Q2) · [ADR index](./README.md) · [ADR-005](./ADR-005-worker-collect.md) · [ADR-006](./ADR-006-parse-fetch-live.md) · [Legacy merge salvage](../../handoff/legacy-ios.md) · [verify.md](../verify.md)

## Context

Phase 2 collects Instagram posts from two sources: **scrape** (Playwright + HTML parse) and **Graph API** (Q2 MVP fields). Planner Q1 requires **one merged snapshot per shortcode** — not separate scrape-only and graph-only rows for the same post.

Legacy `mergePostsByShortcode` in `instagram-ops-studio` flattened both sources into a single `PublicProfilePost` shape. Zeref stores an explicit merged payload on `instagram_post_raw` snapshots.

## Decision

### Payload shape (Q1)

Each collected post is represented as `MergedInstagramPostPayload`:

```ts
{
  shortcode: string;
  sources: ("scrape" | "graph")[];
  graph?: GraphMediaFields;   // Q2 snake_case Graph fields
  scrape?: ScrapePostFields;   // camelCase scrape fields
}
```

- **`sources`** lists which inputs contributed (`scrape`, `graph`, or both).
- **`graph`** holds the raw Graph media object when Graph was used.
- **`scrape`** holds the scrape-shaped view; when both sources exist, fields are merged for downstream convenience (see rules below).

### Merge rules (`mergeByShortcode`)

1. **Key:** shortcode extracted from scrape `shortcode` or Graph `permalink` (`/(p|reel)\/([^/?#]+)/`).
2. **One row per shortcode** in the output map; re-collect at persistence layer = new INSERT (never UPDATE).
3. **Graph wins** for engagement text fields when both exist: `like_count` → `likes`, `comments_count` → `comments`, `caption`.
4. **Scrape wins** for media assets when both exist: `thumbnailUrl`, `videoUrl`, `carouselUrls` (Graph `media_url` does not overwrite scrape thumbnails).
5. **Graph-only** or **scrape-only** inputs produce a valid payload with a single source in `sources[]`.
6. **No invented metrics** — omit fields that are absent; do not synthesize counts.

### Parse vs fetch (Q3)

| Module | CI default | Live |
|--------|--------------|------|
| `parse/*` | Runs on `fixtures/phase-2/html/` | N/A |
| `fetch/*` | Not invoked | `ZEREF_LIVE_INSTAGRAM=1` |

### Graph API MVP (Q2)

Fields on `GraphMediaFields`: `id`, `caption`, `media_type`, `media_url`, `permalink`, `timestamp`, `like_count`, `comments_count`. User endpoint: `id`, `username`.

## Consequences

- Worker collect handler calls `mergeByShortcode` before INSERT; snapshot `payload_json` is the merged object (or array of merged objects per job — worker agent defines batching).
- `@zeref/contracts` exports `MergedInstagramPostPayloadSchema`, `GraphMediaFieldsSchema`, and related Zod types (Phase 2 API agent). `@zeref/instagram` implements merge/parse against these shapes.
- Downstream normalize stage reads snapshot IDs only; merge semantics are stable for Phase 2.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Dual rows (scrape + graph) per shortcode | Violates Q1 |
| Flatten to scrape-only shape in DB | Loses Graph provenance and Q2 field fidelity |
| UPDATE existing snapshot on re-collect | Violates C6 immutability |

## Legacy reference (read-only)

`instagram-ops-studio` `mergePostsByShortcode` flattened Graph+scrape into one `PublicProfilePost`. Zeref keeps provenance in `MergedInstagramPostPayload` and applies the same **Graph-wins counts / scrape-wins media** precedence. See [legacy-ios.md](../../handoff/legacy-ios.md).

## Verification

```powershell
cd c:\Projects\zeref
npm run build
npm -w @zeref/instagram test
# merge + parse + graph fixture tests (no live fetch unless ZEREF_LIVE_INSTAGRAM=1)
```

Included in `npm run verify:phase-2` (ADR-006).
