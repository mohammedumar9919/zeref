# F1 — H2a follow-ups (watch cockpit refresh + insights budget)

Small clean-up card from the C18a/C18b council reviews.

## Deliverables

1. **Cockpit refresh after watch runs** (C18b gap): the scheduled `schedule-collect` job now collects in-process, so it no longer produces the `collect` job-completion cockpit outbox event. After a watch run that inserted at least one new snapshot, insert the same cockpit outbox event a `collect` job completion inserts today (reuse `insertCockpitPipelineOutbox` in `apps/worker/src/lib/cockpit-outbox.ts`; payload shape unchanged). No event for skipped/throttled/no-change runs.
2. **Insights under the Graph budget** (C18a gap): `packages/instagram/src/graph/insights.ts` has its own fetch helper, so insights calls bypass `GraphBudget`, usage back-off and token redaction. Route insights calls through `graphGet` (or the same options) so they count against the budget, throttle, and redact tokens. Existing callers unchanged when no options are passed.
3. **Meta throttling codes:** map Graph error codes 4, 17, 32, 613 (in the JSON error body) to `GraphThrottledError("usage_high")`. Tokens still never in messages.

## Rules

- No db migration, no contracts, no apps/web, no kernel changes.
- Token-leak tests with a fake token for the insights path.
