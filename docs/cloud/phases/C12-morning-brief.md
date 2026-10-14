# C12 — Morning brief (fed by the C18 "what changed" diff)

H2b ([vision intake](../../superpowers/plans/2026-09-30-vision-intake.md)). Depends on C18b (merged: `watch_runs` with `diff_json`, `token_expires_at`, status, `finished_at`).

**Council review required** (contracts `JarvisToolNameSchema`, kernel descriptor — read tier only).

## Goal

"Good morning, Jarvis" / "what changed overnight?" → a short spoken brief and a fact card, built **only** from recorded data: the latest watch run(s) since a cutoff, token expiry, and pipeline status.

## Deliverables

1. **Tool `get_morning_brief`** (tier **read**): contracts tool name, descriptor, executor, `readMorningBrief(ctx)` in `read-adapters.ts` (same `canRead` / `degraded` pattern as `get_weekly_brief`), `getMorningBrief()` on `ZerefReadContext`.
2. **Web implementation** (`apps/web/lib/jarvis/zeref-context.ts` + a new `apps/web/lib/jarvis/morning-brief.ts`):
   - Live: read `watch_runs` (Drizzle, `@zeref/db`) — the latest `ok` run within the last 24 h (`since` arg optional) and any `throttled`/`error` runs in that window; summarise `diff_json` (new posts, removed posts, likes/comments/reach deltas exactly as stored), state **when the data was collected** (`collectedAt` values from the diff), token days left from `token_expires_at`, and whether the watch is on.
   - No run in the window → say so plainly ("No watch run since …"); never invent numbers.
   - Fixture mode (`ZEREF_BFF_FIXTURE=1`): read `fixtures/jarvis/morning-brief.json` (new, clearly labelled fixture data), badge FIXTURE.
3. **Mock LLM** (`llm-port.ts`): route "good morning", "morning brief", "what changed (overnight|since yesterday)" → `get_morning_brief`; finish text built from the result only, ending with the collected-at time. Existing eval prompts must route exactly as before.
4. **Fact card** (`fact-cards.ts`): "Morning brief" — up to 6 fields copied from the result (e.g. New posts, Likes change, Data collected, Token days left, Watch).
5. **Version packs:** add `get_morning_brief: "read"` to `config/jarvis/candidates/v2.json` (not yet promoted). `packs/v1.json` untouched; pack test stays green.

## Rules

- Read-only: no writes, no Graph calls from the brief (it reads stored runs only).
- Honest: every number comes from `watch_runs`; the brief always states when the data was collected; fixture badge in fixture mode.
- Do not edit `eval/**` (propose golden case text in the PR).
- C30 for client code. No db migration, no worker changes.
