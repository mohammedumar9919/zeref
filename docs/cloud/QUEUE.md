# Cloud work queue

**Owner:** Planner (laptop) updates status. **Workers (Grok Bot / Cloud):** take the first `OPEN` row only.

Status legend: `OPEN` · `IN_PROGRESS` · `PR_READY` · `DONE` · `LAPTOP_ONLY` · `BLOCKED`

| Order | ID | Title | Status | Branch prefix | Phase card |
|------:|----|-------|--------|---------------|------------|
| 1 | CLOUD-A0 | Demo fixtures + docs truth-up (no Docker) | DONE | `cloud/a0-` | [phases/A0-demo-ops.md](./phases/A0-demo-ops.md) |
| 2 | CLOUD-P62 | Phase 6.2 Visual Tier 3 | DONE | `cloud/p62-` | [phases/P62-visual-tier3.md](./phases/P62-visual-tier3.md) |
| 3 | CLOUD-A2 | Product surfaces (Reports/Studio/Calendar/Research UI) | DONE | `cloud/a2-` | [phases/A2-product-surfaces.md](./phases/A2-product-surfaces.md) |
| 4 | CLOUD-A3 | Research intel lite (outliers + brief) | IN_PROGRESS | `cloud/a3-` | [phases/A3-research-lite.md](./phases/A3-research-lite.md) |
| 5 | CLOUD-A4 | Streaming voice lite (code only) | OPEN | `cloud/a4-` | [phases/A4-voice-stream.md](./phases/A4-voice-stream.md) |
| 6 | CLOUD-A5 | Submission pack docs | OPEN | `cloud/a5-` | [phases/A5-submission.md](./phases/A5-submission.md) |
| — | LAPTOP-UAT | Mic / Luke screenshot / demo video / Postgres reset | LAPTOP_ONLY | — | — |
| — | TRACK-B | Next 16, publish, auth, vector memory | BLOCKED | — | Until college freeze |

### How to claim a row

1. Set status to `IN_PROGRESS` in this file on your branch (same PR).
2. Append start entry to [AGENT_LOG.md](./AGENT_LOG.md).
3. When PR opened: set `PR_READY` and paste PR URL in AGENT_LOG.
4. Planner sets `DONE` after review/merge.

**Do not** mark yourself `DONE`.
