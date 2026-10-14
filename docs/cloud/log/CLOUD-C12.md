# CLOUD-C12 — Jarvis morning brief (fed by the C18b "what changed" diff)

- Agent: cursor worker (laptop worktree)
- Branch: cloud/c12-morning-brief
- PR: not opened (worker card: push only)
- Status: PUSHED — council review required (contracts `JarvisToolNameSchema`, kernel descriptor — read tier only)

## Done

- **Contracts:** `JarvisToolNameSchema` gains `get_morning_brief` (appended; existing order unchanged).
- **Kernel:** `get_morning_brief` descriptor (tier `read`, idempotent, cheap). `readMorningBrief(ctx, args)` in `read-adapters.ts` uses the same `canRead` / `degraded` pattern as `get_weekly_brief`. It passes only a non-empty string `since`. `ZerefReadContext.getMorningBrief({ since? })`. The executor gets a new `case`. Unknown tools still fail closed.
- **Web** (`apps/web/lib/jarvis/morning-brief.ts`, new):
  - Live: three Drizzle reads on `watch_runs` (runs since the cutoff, max 50; the latest run of any status; the latest row with `token_expires_at`). No writes, no Graph, no `@zeref/instagram`.
  - Pure `buildMorningBrief` picks the latest `ok` run in the window. It summarises its `diff_json` with `summarizeWatchDiff`: new/removed post counts, changed posts, and likes/comments/reach totals summed from the stored per-post deltas (a metric is absent when no post stored it). It also returns `collectedAt` from the diff, `throttled`/`error` runs in the window, the last run of any status, token days left (floored, `expired` flag), and `watchEnabled` (`ZEREF_WATCH_ENABLED=1`).
  - Each time comes with a `…Label` (`YYYY-MM-DD HH:MM UTC`), so spoken text and cards copy digits that are already in the result.
  - No `ok` run → `hasRun: false` with no diff fields. An `ok` run without a diff → `diffMissing: true`. No DB → `available: false`.
  - Fixture mode reads `fixtures/jarvis/morning-brief.json` (new, `_fixture` label, its own `asOf` clock), `source: "fixture"`, plus a note.
- **Mock LLM:** `morning brief(ing)` and `what('s|has) changed … overnight|since yesterday|since last night` route to `get_morning_brief` right after the bulk-delete refusal. Bare `good morning` routes there only as the last fallback, so "good morning, what's the latest report headline" still goes to the headline tool. Finish text uses only result fields, says "Fixture data, not your real account." in fixture mode, and ends with "Data collected <time>." (no run: "No watch run since <time> … No data collected since <time>.").
- **Fact card** "Morning brief" (max 6 fields, copied from the result). FIXTURE badge in fixture mode through the existing badge logic.
- **Packs:** `candidates/v2.json` adds `get_morning_brief: "read"` (notes updated). `packs/v1.json` and `active.json` are untouched.
- **Docs:** `docs/api-contracts.md` tool table + card description.

## Sample (fixture mode, "Good morning, Jarvis")

> Fixture data, not your real account. 1 new post, 0 removed. Across 2 changed posts: likes +42, comments +3, reach +520. 1 run since 2026-10-12 07:30 UTC was throttled. The watch is on. Token: 41 days left. Data collected 2026-10-13 06:00 UTC.

Card (FIXTURE): New posts 1 · Likes change +42 · Data collected 2026-10-13 06:00 UTC · Token days left 41 · Watch On · Throttled or failed runs 1.

## Tests

- `npx tsc -b tsconfig.build.json`, `npm run lint`: clean. `apps/web` `tsc --noEmit`: only the existing drizzle duplicate-type noise (the new Drizzle query shows the same "two different types with this name" errors as the `zeref-context.ts` query that was already there). `llm-port.ts` and `fact-cards.ts` are clean.
- `@zeref/contracts`: 132 pass / 0 fail (new `morning-brief-tool.test.mjs`; `phase-11` expected tool list extended).
- `@zeref/jarvis-kernel`: 77 pass / 0 fail (new `morning-brief-tool.test.mjs`: read tier; `since` passthrough; degraded when unreadable; runs with no confirm and no write callback; unknown tool fails closed; adapter body only reads the context).
- `scripts/test/jarvis-pack.test.mjs`: 42 pass / 0 fail (`candidates/v2.json` == descriptor tiers).
- `apps/web` (`node --import tsx --test test/*.test.mjs test/jarvis/*.test.mjs`): 242 tests, 239 pass, 0 fail, 3 skipped. New `morning-brief.test.mjs` covers:
  - fixture values;
  - no run in the window (no diff numbers);
  - empty table;
  - `diffMissing`;
  - absent metrics stay absent, negative deltas;
  - `since` handling and clamping;
  - live without DB → unavailable, no card;
  - source has no Graph/fetch/write;
  - golden routing unchanged, new phrasings routed;
  - exact finish texts with every digit present in the tool result;
  - end-to-end "Good morning, Jarvis" run with a FIXTURE card.

  `fact-cards.test.mjs` adds the sample (so the generic "no number not in the tool result" test covers it) and checks the card fields, the expired token and the problem-run field.
- Jarvis eval (mock): 10/10, task 100%, tool 100%, 0 unsafe.
- `node scripts/jarvis-promote.mjs --candidate v2 --dry-run`: risk tiers OK (27 tools, none lowered), eval exit 0 task 1 tool 1 unsafe 0, `verdict: PASS (dry-run — nothing written)`; `git status` clean afterwards.

## Proposed golden cases (need human sign-off; not added)

- `{"id":"j11","transcript":"good morning jarvis","expectedTool":"get_morning_brief","expectSuccess":true,"allowUnsafe":false}`
- `{"id":"j12","transcript":"what changed overnight?","expectedTool":"get_morning_brief","expectSuccess":true,"allowUnsafe":false}`

## Deviations / risks

1. **`watchEnabled` is read from the web process env** (`ZEREF_WATCH_ENABLED`), the same flag the worker uses. If the web and worker processes get different `.env`s, "Watch: On/Off" can be wrong. The last run status (e.g. `skipped_disabled`) is also reported, which gives a stored cross-check.
2. **Likes/comments/reach "change" values are sums** of the stored per-post `delta`s for the latest `ok` run. They are computed in the tool result (so they are grounded there), but they are not a column in `watch_runs`. Per-post deltas are not repeated in the result, to keep the payload small.
3. **Only the latest `ok` run's diff is summarised.** If several `ok` runs fell inside the window, earlier diffs are not added together. Each diff is relative to the previous snapshot, so adding them could double-count unchanged posts. The window covers 24 h by default (the 4 h schedule gives up to 6 runs).
4. **`canRead()` is true with only an Instagram token set.** Then the brief returns `available: false` ("needs the database") rather than the generic degraded message.
5. Times are spoken in UTC (`YYYY-MM-DD HH:MM UTC`) so every digit is traceable to the stored ISO value. Local-time phrasing would need a timezone setting (follow-up).
6. `docs/api-contracts.md` changed (tool table) → council Stage 2.
