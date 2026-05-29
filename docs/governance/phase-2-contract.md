# Zeref — Phase 2 Contract (Implementation)

**Phase:** 2  
**Status:** **APPROVED** (Planner sign-off 2026-05-28)  
**Theme:** Instagram collectors → immutable snapshots (collect stage only)

**Prerequisites:** Phase 1 approved (`verify:phase-1` green; commits through `b23f611`).

---

## Planner decisions (binding)

### Open questions (Q1–Q4)

| # | Question | Planner decision |
|---|----------|------------------|
| **Q1** | Single vs dual snapshot per source | **One merged snapshot per collect target.** For posts: one `instagram_post_raw` row per shortcode with merged `{ graph?, scrape?, sources[] }` payload. Do **not** write separate scrape-only and graph-only rows for the same shortcode in Phase 2. Re-collect = new INSERT (new snapshot id), never UPDATE. |
| **Q2** | Graph API MVP | **In scope:** `GET /{ig-user-id}` (account id, username) and `GET /{ig-user-id}/media` with fields: `id`, `caption`, `media_type`, `media_url`, `permalink`, `timestamp`, `like_count`, `comments_count`. Optional single-media fetch by Graph media id when job supplies it. **Out of scope Phase 2:** Insights API, reach/impressions breakdowns, stories, DMs, competitor discovery, publishing. |
| **Q3** | Playwright in CI | **CI: no browser launch.** Split `@zeref/instagram` into **fetch** (Playwright, local/live only) and **parse** (pure functions on frozen HTML). `verify:phase-2` runs parse + merge + Graph mock against `fixtures/phase-2/`. Playwright fetch only when `ZEREF_LIVE_INSTAGRAM=1` (local, skipped in CI). Document in **ADR-006**. |
| **Q4** | Collect enqueue surface | **CLI/script only** for Phase 2: e.g. `scripts/enqueue-collect.mjs` + direct handler tests. **No public HTTP route** in `apps/api` yet (defer to Phase 3/4). |

### Additional conditions (C7–C10)

| ID | Condition |
|----|-----------|
| **C7** | `CollectJobOutput` with `{ snapshotId, contentHash, shortcode? }` in `@zeref/contracts`; bump `PHASE2_CONTRACT_VERSION`. |
| **C8** | `content_hash` dedupe policy in **ADR-005**: same hash + same account + same kind → idempotent no-op **or** return existing id (pick one; document). |
| **C9** | Worker registers **only** `collect`; other job types must **not** appear in worker registry. |
| **C10** | `verify:phase-2` added to CI in the same PR wave as implementation (after `verify:phase-1`). |

---

## Goals

1. **`packages/instagram`** — Instagram collection library:
   - **parse** — pure HTML parsers on `fixtures/phase-2/html/` (CI-safe)
   - **fetch** — Playwright fetch (local only; `ZEREF_LIVE_INSTAGRAM=1`)
   - **graph** — Graph API client (mocked in CI via `fixtures/phase-2/graph/`)
   - **merge** — rewrite `mergePostsByShortcode` behavior (one payload per shortcode)
2. **Collect jobs write immutable snapshots only** — INSERT into `snapshots` (C6); re-collect = new row.
3. **`apps/worker`** — **collect handler only** (pg-boss); ADR-005 idempotency per C8.
4. **`scripts/enqueue-collect.mjs`** — CLI enqueue (Q4); no HTTP collect route.
5. **`npm run verify:phase-2`** — parse + merge + Graph mock; no Playwright in CI (Q3).
6. **CI** — `verify:phase-2` after `verify:phase-1` (C10).

---

## Non-goals (out of scope)

| Area | Notes |
|------|--------|
| normalize / analyze / report worker handlers | Phase 1 contracts only |
| Cockpit UI | Phase 5 |
| Jarvis / voice | Phase 6+ |
| Report synthesis / rendering | Phase 4 |
| Analytics / embeddings / pgvector | Phase 3 |
| Re-scrape in downstream stages | IDs only downstream |
| Stub job types | No handler without tests |
| HTTP collect API in `apps/api` | Q4 — deferred |
| Graph Insights, stories, DMs, publishing | Q2 — out of scope |

---

## Architecture constraints

- **Collect once** → immutable `snapshots` row; downstream reads IDs only.
- **One merged row per shortcode** (Q1) — no dual scrape/graph rows.
- **Contracts canonical** — `@zeref/contracts`; merged payload Zod in contracts or `@zeref/instagram` per ADR-004.
- **TDD** — failing test first; fixtures under `fixtures/phase-2/`.
- **Windows** — `pathToFileURL` for dynamic ESM in verify scripts.
- **Legacy** — `c:\Projects\instagram-ops-studio` read-only; rewrite with tests.

---

## Package layout

```
packages/instagram/
├── src/
│   ├── parse/           # Pure HTML parsers (CI)
│   ├── fetch/           # Playwright fetch (live only)
│   ├── graph/           # Graph API + mappers (Q2 fields)
│   ├── merge/           # mergeByShortcode (rewrite)
│   └── index.ts
├── test/
└── package.json

fixtures/phase-2/
├── html/                # Frozen HTML (parse smoke)
├── graph/               # Mock Graph responses
└── expected/            # Optional golden merged payloads

apps/worker/
└── src/jobs/collect.ts  # ONLY collect handler (C9)

scripts/
├── enqueue-collect.mjs  # CLI enqueue (Q4)
└── verify-phase-2.mjs
```

---

## Collect pipeline

1. Validate `CollectJobInput` (extended: `sources`, `shortcodes`, etc.).
2. Upsert `platform_accounts` when needed.
3. **graph** — fetch user + `/media` per Q2 (or use fixtures in tests).
4. **fetch/parse** — Playwright fetch locally OR parse fixture HTML in CI.
5. **merge** — one payload per shortcode `{ graph?, scrape?, sources[] }`.
6. Compute `contentHash`; apply C8 dedupe policy (ADR-005).
7. **INSERT** `snapshots` (`instagram_post_raw` / `instagram_profile_raw`).
8. Return `CollectJobOutput`: `{ snapshotId, contentHash, shortcode? }` (C7).

---

## Graph API MVP (Q2)

| Endpoint | Purpose |
|----------|---------|
| `GET /{ig-user-id}` | Account id, username |
| `GET /{ig-user-id}/media` | Media list with: `id`, `caption`, `media_type`, `media_url`, `permalink`, `timestamp`, `like_count`, `comments_count` |
| `GET /{media-id}` (optional) | Single media when job supplies Graph media id |

---

## Contracts (`@zeref/contracts`) — C7

- Extend `CollectJobInput`: `sources: ('scrape' | 'graph')[]`, `shortcodes?`, etc.
- Add `CollectJobOutput`: `{ snapshotId, contentHash, shortcode? }`
- `MergedInstagramPostPayload` Zod: `shortcode`, `sources[]`, `graph?`, `scrape?`
- Export `PHASE2_CONTRACT_VERSION`
- Fixtures: `fixtures/phase-2/graph/` for contract/Graph tests

---

## Worker — C8, C9

- Register **only** `collect` with pg-boss.
- Handler: `@zeref/instagram` → INSERT snapshot → `CollectJobOutput`.
- **ADR-005**: document C8 dedupe (no-op vs return existing `snapshotId`).
- Integration test: enqueue → snapshot row exists; C6 trigger blocks UPDATE.
- **No** normalize/analyze/report in registry.

---

## Verify gate: `npm run verify:phase-2`

| Check | Requirement |
|-------|-------------|
| Contract + ADRs | phase-2-contract, ADR-004/005/006 |
| Build | `npm run build` |
| C7 | `PHASE2_CONTRACT_VERSION` + `CollectJobOutput` |
| Parse smoke | `fixtures/phase-2/html/` — **no Playwright in default path** (Q3) |
| Graph mock | `fixtures/phase-2/graph/` — no live Graph in CI |
| Merge tests | merge-by-shortcode unit tests |
| DB (optional) | collect handler INSERT + C6 |
| Live | `ZEREF_LIVE_INSTAGRAM=1` only; skipped in CI |

**CI (C10):** `npm run verify:phase-2` after `verify:phase-1`; `DATABASE_URL` set; no `ZEREF_LIVE_INSTAGRAM`.

---

## ADRs

Index: [docs/governance/adr/README.md](./adr/README.md) · Legacy merge notes: [legacy-ios.md](../handoff/legacy-ios.md)

| ADR | Owner | Topic |
|-----|-------|--------|
| [ADR-004](./adr/ADR-004-instagram-merge.md) | Scrape + API | Merge-by-shortcode (Q1) |
| [ADR-005](./adr/ADR-005-worker-collect.md) | Worker | pg-boss collect + C8 dedupe |
| [ADR-006](./adr/ADR-006-parse-fetch-live.md) | QA | parse vs fetch vs live (Q3) |

---

## Acceptance criteria

- Q1–Q4 and C7–C10 satisfied.
- `verify:phase-0`, `verify:phase-1`, `verify:phase-2` green locally + CI.
- No out-of-scope features.

---

## Agent ownership

| Agent | Deliverables |
|-------|----------------|
| Scrape | `packages/instagram` parse/fetch/merge; `fixtures/phase-2/html/`; ADR-004 |
| API/Contracts | CollectJob I/O, merged Zod, `PHASE2_CONTRACT_VERSION`; `fixtures/phase-2/graph/` |
| Worker | collect handler, pg-boss, ADR-005, `enqueue-collect.mjs` coordination |
| QA | `verify-phase-2.mjs`, CI C10, ADR-006 |
| Docs | ADR bodies, `verify.md`, STATE, `legacy-ios.md` merge notes |
