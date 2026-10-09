# Cloud work queue

**Owner:** Planner (laptop) updates status. **Workers (Grok Bot / Cloud):** work only on the ID your chat prompt assigns, and only if it is `OPEN` — see [GROK.md](./GROK.md).

Status legend: `OPEN` · `NEXT` · `IN_PROGRESS` · `PR_READY` · `DONE` · `LAPTOP_ONLY` · `BLOCKED`

| Order | ID | Title | Status | Branch prefix | Phase card |
|------:|----|-------|--------|---------------|------------|
| 1 | CLOUD-A0 | Demo fixtures + docs truth-up (no Docker) | DONE | `cloud/a0-` | [phases/A0-demo-ops.md](./phases/A0-demo-ops.md) |
| 2 | CLOUD-P62 | Phase 6.2 Visual Tier 3 | DONE | `cloud/p62-` | [phases/P62-visual-tier3.md](./phases/P62-visual-tier3.md) |
| 3 | CLOUD-A2 | Product surfaces (Reports/Studio/Calendar/Research UI) | DONE | `cloud/a2-` | [phases/A2-product-surfaces.md](./phases/A2-product-surfaces.md) |
| 4 | CLOUD-A3 | Research intel lite (outliers + brief) | DONE | `cloud/a3-` | [phases/A3-research-lite.md](./phases/A3-research-lite.md) |
| 5 | CLOUD-A4 | Streaming voice lite (code only) | DONE | `cloud/a4-` | [phases/A4-voice-stream.md](./phases/A4-voice-stream.md) |
| 6 | CLOUD-A5 | Submission pack docs | DONE | `cloud/a5-` | [phases/A5-submission.md](./phases/A5-submission.md) |
| — | LAPTOP-UAT | Mic / Luke screenshot / demo video / Postgres reset | IN_PROGRESS | — | [phases/LAPTOP-UAT.md](./phases/LAPTOP-UAT.md) |
| 7 | CLOUD-B0 | Live Instagram Graph setup docs | DONE | `cloud/b0-` | [phases/B0-meta-graph-prep.md](./phases/B0-meta-graph-prep.md) |
| 8 | CLOUD-B1 | Live data operator path + IG health probe | DONE | `cloud/b1-` | [phases/B1-live-data-ops.md](./phases/B1-live-data-ops.md) |
| 9 | CLOUD-B2 | Live Graph collect UAT glue (needs human tokens) | DONE | `cloud/b2-` | [phases/B2-live-graph-uat.md](./phases/B2-live-graph-uat.md) |
| 10 | CLOUD-B3 | Competitor Business Discovery + reel ideas (FB Login token) | DONE | `cloud/b3-` | [phases/B3-competitor-discovery.md](./phases/B3-competitor-discovery.md) |
| 11 | CLOUD-B4 | Live Facebook competitor UAT glue | DONE | `cloud/b4-` | [phases/B4-competitor-uat.md](./phases/B4-competitor-uat.md) |
| 12 | CLOUD-B5 | Live pipeline freshness (bulk Graph collect) | DONE | `cloud/b5-` | [phases/B5-pipeline-freshness.md](./phases/B5-pipeline-freshness.md) |

### Track C — week 1 (2026-09-27 → 10-03) · operating rules: [GROK.md](./GROK.md)

| Order | ID | Title | Status | Wave | Depends | Branch prefix | Phase card |
|------:|----|-------|--------|------|---------|---------------|------------|
Week plan (waves, cut order, demo DoD): [2026-09-28-week-plan.md](../superpowers/plans/2026-09-28-week-plan.md). This week the **lead runs agents locally**; rows marked IN_PROGRESS are taken.

| Order | ID | Title | Status | Wave | Depends | Branch prefix | Phase card |
|------:|----|-------|--------|------|---------|---------------|------------|
| 13 | CLOUD-C0 | CI green (gate) — round 2 | DONE | A | B5 | `cloud/c0-` | [phases/C0-ci-green.md](./phases/C0-ci-green.md) |
| 14 | CLOUD-C1 | Typed HUD composer + confirm card | DONE | A | C0 (merge) | `cloud/c1-` | [phases/C1-typed-composer.md](./phases/C1-typed-composer.md) |
| 15 | CLOUD-C3 | Memory vault v0 | DONE | A | C0 (merge) | `cloud/c3-` | [phases/C3-memory-vault.md](./phases/C3-memory-vault.md) |
| 21 | CLOUD-D1 | Projector polish + report honesty | DONE | B | C0 | `cloud/d1-` | [phases/D1-projector-polish.md](./phases/D1-projector-polish.md) |
| 16 | CLOUD-C6 | Pro charts v1 | DONE | B | C0 | `cloud/c6-` | [phases/C6-pro-charts.md](./phases/C6-pro-charts.md) |
| 22 | CLOUD-D2 | Jarvis answers with real content | DONE (#28) | B | C1, C3 | `cloud/d2-` | [phases/D2-jarvis-answers.md](./phases/D2-jarvis-answers.md) |
| 17 | CLOUD-C2 | Confirm-gated cockpit collect | DONE (#31) | C | C1, C3, D2 | `cloud/c2-` | [phases/C2-cockpit-collect.md](./phases/C2-cockpit-collect.md) |
| 23 | K1 | Kernel gate hardening (confirm bound to run + tool + args, single use; unknown tools fail closed) | DONE (#30) | C | D2 | `cloud/k1-` | [phases/K1-kernel-gate.md](./phases/K1-kernel-gate.md) |
| 24 | C20a | Split CI into parallel jobs (< 20 min target) | IN PROGRESS | C | — | `cloud/c20a-` | [phases/C20a-ci-split.md](./phases/C20a-ci-split.md) |
| 25 | C17a | Fact cards as Jarvis speaks (tool-result values only, whitelist, badges) | IN PROGRESS | C | D2, K1 | `cloud/c17a-` | [phases/C17a-fact-cards.md](./phases/C17a-fact-cards.md) |
| 18 | CLOUD-C5 | Semantic contradiction v1 | DONE | C | C3 | `cloud/c5-` | [phases/C5-semantic-contradiction.md](./phases/C5-semantic-contradiction.md) |

### Track C — week 2 (cards ready)

| Order | ID | Title | Status | Depends | Branch prefix | Phase card |
|------:|----|-------|--------|---------|---------------|------------|
| 19 | CLOUD-C4 | Vector recall (hybrid RRF, migration 0006) | NEXT | C3, C5 | `cloud/c4-` | [phases/C4-vector-recall.md](./phases/C4-vector-recall.md) |
| 20 | CLOUD-C7 | Version packs + human-only promotion gate | NEXT | C3 | `cloud/c7-` | [phases/C7-version-packs.md](./phases/C7-version-packs.md) |

Horizon 2 / 3 phases (C8–C16) are listed in [MASTERPLAN.md](./MASTERPLAN.md); they get rows + cards when week 2 merges. Anything without a row here is still forbidden.

### How to claim a row (Track C)

1. Your chat prompt names **one assigned ID**. It must be `OPEN` here on `main`.
2. `gh pr list --state open --search "head:cloud/<id>-"` — if a PR exists, stop.
3. Branch from latest `origin/main`; open a **draft PR** after the first commit.
4. Write `docs/cloud/log/<ID>.md`. **Do not edit this file or AGENT_LOG.md** — parallel PRs would conflict.
5. Planner sets `DONE` after merge and flips dependents `NEXT → OPEN`.

Status legend (Track C adds): `NEXT` = card ready, waiting for a dependency to merge.

**Do not** mark yourself `DONE`.

### Track status (authoritative)

- **Track A (college):** DONE (A0–A5). **LAPTOP-UAT IN_PROGRESS** (fixture demo video / Luke screenshot / slides).
- **Track B (live Graph + competitor):** B0–B5 **DONE** (B5 = PR #18).
- **Track C (build horizon):** week 1 ACTIVE — wave A (C0 r2, C1, C3) IN_PROGRESS by lead agents; demo rehearsal Thu 1 Oct ([DEMO_SCRIPT](../demo/DEMO_SCRIPT.md)). TRACK-B-DEFER dissolved into C4 / C7 / Horizons 2–3.

**Grok / Cloud worker rule:** QUEUE wins over stale AGENT_LOG lines.
