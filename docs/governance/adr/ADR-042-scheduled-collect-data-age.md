# ADR-042: Scheduled collect + data-age honesty (Phase 12)

**Status:** **PROPOSED** (Lead 2026-06-16)  
**Date:** 2026-06-16  
**Owner:** P12-B (schedule) + P12-C (data-age)  
**Related:** [phase-12-contract.md](../phase-12-contract.md) C163–C178 · [ADR-004](./ADR-004-instagram-merge.md) · [ADR-005](./ADR-005-worker-collect.md) · [ADR-006](./ADR-006-parse-fetch-live.md) · [phase-11-contract.md](../phase-11-contract.md) C153

---

## Context

Phase 11 gave JARVIS agentic reads and guarded writes, but cockpit panels and read tools still surface **fixtures or stale DB rows** without telling the operator how fresh the data is. Normalized payloads **drop media URLs** that exist on merged snapshots (ADR-004 scrape-wins), breaking Studio previews and honest read-tool responses.

The vision loop requires: **live Instagram collect → normalize with media → cockpit + JARVIS with honest age labels**.

Phase 10 established `dev:stack` as the operator path with real worker consumption. Phase 12 extends that path with **scheduled Graph collect** and **data-age metadata** on every panel slice and JARVIS read result.

---

## Decision

### 1. Restore media in normalized payload (C163–C164)

Extend `NormalizedPostPayload` with optional:

- `thumbnailUrl?: string`
- `videoUrl?: string`
- `carouselUrls?: string[]`

`buildNormalizedPostPayload` copies these from the merged snapshot using `@zeref/analytics` `fieldsFromMerged` (ADR-004: scrape wins for media assets).

Contracts version bump in `@zeref/contracts`; downstream normalize jobs re-run on new collects only (no retroactive UPDATE of snapshot rows).

### 2. Scheduled collect via pg-boss (C165)

New recurring job type: **`schedule-collect`**.

| Aspect | Value |
|--------|-------|
| Default interval | 6 hours |
| Env gate | `INSTAGRAM_ACCESS_TOKEN` must be set |
| Action | Enqueue standard `collect` jobs for configured account/shortcodes |
| CI | Unit-test registration only; **no live Graph** (C170) |

Follows ADR-005 collect handler; does not re-scrape in downstream jobs (failures-checklist C6).

Configurable interval via env (e.g. `ZEREF_COLLECT_INTERVAL_HOURS`) — document in `.env.example` (P12-B).

### 3. Operator live path (C166)

When `INSTAGRAM_ACCESS_TOKEN` is set and `dev:stack` runs:

- Worker uses Graph collect path (not fixture-only)
- `ZEREF_LIVE_INSTAGRAM` remains local-only per ADR-006; never set in CI
- `verify:phase-12` **deletes** `ZEREF_LIVE_INSTAGRAM` from child env (C170)

### 4. Data-age honesty (C167–C169)

Every cockpit slice item exposed by `cockpit-bff.ts` includes:

- `collectedAt` — ISO timestamp of latest snapshot or entity row
- `dataAgeMs` — `Date.now() - collectedAt` at BFF read time

**Badge states** (C168):

| State | Rule |
|-------|------|
| `fixture` | `ZEREF_BFF_FIXTURE=1` or explicit fixture source |
| `stale` | `dataAgeMs` exceeds threshold (default 24h; configurable) |
| `live` | Fresh DB/worker data within threshold |

Badges on Studio, Calendar, Reports, Research panels — never silent empty that looks like "no posts."

JARVIS read tools (extends C153) include the same `collectedAt` / `dataAgeMs` / `dataAgeState` in tool results so the agent can answer "how fresh is this?"

### 5. Verify harness (C170–C173, C175–C176)

- `verify:phase-12` chains `verify:phase-11`
- `ZEREF_PHASE12_DATA=1` gates Playwright `cockpit-data-age-12.spec.ts`
- Fixture mode asserts `fixture` badge visible
- `verify:phase-10.5` remains in chain via P11 → P10.5 (C128 single SSE regression)

### 6. dev:stack agent default (C177)

`scripts/dev-stack.mjs` sets `ZEREF_PHASE11_AGENT=1` on the web child process so operator UAT uses the agent path by default.

---

## Consequences

- Operators can trust panel data freshness without guessing fixture vs live
- Studio entity previews can show thumbnails again after normalize re-run
- Scheduled collect requires valid `INSTAGRAM_ACCESS_TOKEN`; missing token = schedule job no-ops (logged, not fatal)
- CI remains deterministic — no Instagram network, no Playwright live fetch
- P12-B must not edit contracts until P12-A merges (Amendment T firewall)

---

## Alternatives rejected

| Option | Why rejected |
|--------|--------------|
| Client-side "last fetched" only | Theater — does not reflect DB/snapshot truth |
| Poll cockpit slices on interval | Refetch storm; violates failures-checklist RSC-first |
| Always-on live scrape in CI | ADR-006; flaky, requires browsers + network |
| Skip scheduled collect; manual enqueue only | Operator burden; vision loop stalls on stale data |
| Data-age only in JARVIS, not UI | Operators without voice still need honesty |
