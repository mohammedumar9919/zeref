# Cloud work queue

**Owner:** Planner (laptop) updates status. **Workers (Grok Bot / Cloud):** take the first `OPEN` row only.

Status legend: `OPEN` · `IN_PROGRESS` · `PR_READY` · `DONE` · `LAPTOP_ONLY` · `BLOCKED`

| Order | ID | Title | Status | Branch prefix | Phase card |
|------:|----|-------|--------|---------------|------------|
| 1 | CLOUD-A0 | Demo fixtures + docs truth-up (no Docker) | DONE | `cloud/a0-` | [phases/A0-demo-ops.md](./phases/A0-demo-ops.md) |
| 2 | CLOUD-P62 | Phase 6.2 Visual Tier 3 | DONE | `cloud/p62-` | [phases/P62-visual-tier3.md](./phases/P62-visual-tier3.md) |
| 3 | CLOUD-A2 | Product surfaces (Reports/Studio/Calendar/Research UI) | DONE | `cloud/a2-` | [phases/A2-product-surfaces.md](./phases/A2-product-surfaces.md) |
| 4 | CLOUD-A3 | Research intel lite (outliers + brief) | DONE | `cloud/a3-` | [phases/A3-research-lite.md](./phases/A3-research-lite.md) |
| 5 | CLOUD-A4 | Streaming voice lite (code only) | DONE | `cloud/a4-` | [phases/A4-voice-stream.md](./phases/A4-voice-stream.md) |
| 6 | CLOUD-A5 | Submission pack docs | DONE | `cloud/a5-` | [phases/A5-submission.md](./phases/A5-submission.md) |
| — | LAPTOP-UAT | Mic / Luke screenshot / demo video / Postgres reset | LAPTOP_ONLY | — | — |
| 7 | CLOUD-B0 | Live Instagram Graph setup docs | DONE | `cloud/b0-` | [phases/B0-meta-graph-prep.md](./phases/B0-meta-graph-prep.md) |
| 8 | CLOUD-B1 | Live data operator path + IG health probe | DONE | `cloud/b1-` | [phases/B1-live-data-ops.md](./phases/B1-live-data-ops.md) |
| 9 | CLOUD-B2 | Live Graph collect UAT glue (needs human tokens) | DONE | `cloud/b2-` | [phases/B2-live-graph-uat.md](./phases/B2-live-graph-uat.md) |
| 10 | CLOUD-B3 | Competitor Business Discovery + reel ideas (FB Login token) | PR_READY | `cloud/b3-` | [phases/B3-competitor-discovery.md](./phases/B3-competitor-discovery.md) |
| — | TRACK-B-DEFER | Next 16, Meta publish/App Review, auth product, vector memory | BLOCKED | — | After B3+ (not for Grok now) |

### How to claim a row

1. Set status to `IN_PROGRESS` in this file on your branch (same PR).
2. Append start entry to [AGENT_LOG.md](./AGENT_LOG.md).
3. When PR opened: set `PR_READY` and paste PR URL in AGENT_LOG.
4. Planner sets `DONE` after review/merge.

**Do not** mark yourself `DONE`.

### Track status (authoritative)

- **Track A (college):** DONE (A0–A5).
- **Track B (live Graph + competitor):** **ACTIVE** for Grok Bot / Cloud workers.
- **First OPEN for workers right now:** none while CLOUD-B3 is PR_READY (`cloud/b3-competitor-discovery`). Do not start another row.
- **TRACK-B-DEFER** (formerly TRACK-B-REST) stays BLOCKED on purpose — Next 16 / publish / auth / vector. **Do not treat that row as “all Track B blocked.”**

**Track B note (2026-09-14):** Planner unblocked Track B for remote workers. B0–B2 DONE on laptop. CLOUD-B3 is PR_READY on `cloud/b3-competitor-discovery` (agent:jarvis-lite) — https://github.com/mohammedumar9919/zeref/pull/14. Fixture CI stays mock-safe; live FB Business Discovery UAT needs human `FACEBOOK_*` after PR merge. Do not remove Instagram Login Insights.

**Grok / Cloud worker rule:** Ignore stale AGENT_LOG lines that say “do not start TRACK-B.” QUEUE above wins.
