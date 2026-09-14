# Zeref Masterplan — Cloud copy (Track A / Track B)

**Source date:** 2026-09-10 · **Synced into repo:** 2026-09-11 for Grok Bot / Cloud Agents  
**Authoritative laptop plan:** user's Cursor plan `zeref_2026_masterplan` (local). **If conflict:** prefer this file for remote work scope; prefer [../CURRENT_STATE.md](../CURRENT_STATE.md) for what is already shipped.

---

## Scorecard

| Lens | Status |
|------|--------|
| Phases **0–12** | **APPROVED / frozen** — do not rebuild |
| College demo readiness | Track A **DONE** (A0–A5) |
| Next remote work | **Track B ACTIVE** — first OPEN = **CLOUD-B3** ([QUEUE.md](./QUEUE.md)) |

---

## Dual track

**Track A — College flash (DONE)**  
6.2 HUD → product surfaces → research-lite → streaming-lite → submission pack.

**Track B — ACTIVE (2026-09-14)**  
B0–B2 DONE (Instagram Login collect + Insights). **CLOUD-B3 OPEN** — Facebook Login Business Discovery + reel ideas for Grok Bot. Deferred (BLOCKED): Next 16, Meta publish + App Review, auth product, vector memory (`TRACK-B-DEFER`).

---

## Track A phases (summary)

| ID | Name | Remote? | Notes |
|----|------|---------|-------|
| A0 | Demo ops | **Partial** | `scripts/demo-start.ps1` + fixture entity `550e8400-e29b-41d4-a716-446655440001`; live Docker DB reset = laptop |
| A1 / 6.2 | Visual Tier 3 | **Yes** | Highest flash ROI — UI only |
| A2 | Reports/Studio/Calendar/Research polish | **Yes** | Charts + media preview + content slots |
| A3 | Research intel lite | **Mostly yes** | Outlier math + briefs; Graph competitor optional |
| A4 | Streaming voice lite | **Code yes / UAT laptop** | Cascaded TTS from `agent.step`; mic test on laptop |
| A5 | Submission pack | **Docs yes** | [../submission/](../submission/) abstract/script/PPT outline; video = laptop |

## Kill list (never do)

- Rewrite JARVIS onto LangGraph / Realtime-only tool loop
- Instagram scrape / personal accounts
- Next 16 mid-demo
- Fake unlabeled fixture data as “live”
- Purple AI gradients / green CTA HUD swap
- Commit secrets

## Abstract (flash — finalized CLOUD-A5)

**Title:** ZEREF — An Autonomous JARVIS Command Center for Instagram Growth

Full text: [../submission/ABSTRACT.md](../submission/ABSTRACT.md). Do not invent a different product claim.

Zeref is a Luke-style JARVIS command center over an immutable Instagram ops pipeline (collect → normalize → embed → analyze → report). The cockpit is Studio, Calendar, Reports, and Research. JARVIS reads those surfaces and writes only after conversational confirm. College demo is fixture-honest (`Fixture` / `SIMULATED`). Meta publish is Track B and is **not** claimed.

**One line:** A JARVIS command center for Instagram growth ops — honest data, human approval, no fake live publish.

---

## Governance for remote agents

- One file, one owner — see root [AGENTS.md](../../AGENTS.md)
- Council: max one cloud worker on a slice unless QUEUE says parallel
- Verify: prefer scoped tests + `npm run lint` / package tests; full `verify:phase-N` may need Playwright browsers installed in cloud VM
- Always leave a trail in [AGENT_LOG.md](./AGENT_LOG.md)
