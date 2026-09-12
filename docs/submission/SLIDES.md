# Slide outline (10 slides)

Use 8–12. This pack ships **10**. Cyan on void; JetBrains Mono labels; no purple AI gradients; no unlabeled “live” charts.

**Deck title:** ZEREF — An Autonomous JARVIS Command Center for Instagram Growth

Screenshot TODO (laptop, after visual UAT): cockpit globe, research HIT999, Studio LOG240, Reports narrative. Until then, use the Luke HUD reference and fixture copy — do not paste unlabeled analytics screenshots.

---

## Slide 1 — Title

- **ZEREF**
- An Autonomous JARVIS Command Center for Instagram Growth
- Mohammed Umar Salam
- College flash / Track A
- Footer: fixture-honest demo

**Speaker:** Title only. Do not add a second product slogan.

---

## Slide 2 — Problem

- Creators juggle scrapers, sheets, schedulers, and a chatbot that cannot see ops
- Dashboards hide whether numbers are live, stale, or fake
- Autopilot publish is unsafe and (here) **not built**

**One line:** Growth needs a command center, not another unlabeled chart.

---

## Slide 3 — Claim

- One HUD. One voice. One pipeline.
- JARVIS **reads** cockpit, reports, research
- JARVIS **writes** only after conversational confirm + audit
- Autonomous **inside** the room — not an Instagram autopilot

**Do not put:** “Auto-posts to Instagram.”

---

## Slide 4 — Architecture (honest)

```
collect → normalize → embed → analyze → report
        immutable snapshot (no re-scrape)
```

- `@zeref/contracts` = JSON shapes
- BFF-only browser
- Worker + Postgres when live; **fixture mode** for this demo
- JARVIS: portable ReAct + MCP-style tools (not LangGraph, not OpenAI Realtime)

---

## Slide 5 — Command center HUD

- Luke-style cyan / void cockpit
- Globe + four panels: Studio · Calendar · Reports · Research
- Workspace routes hide the grid (Phase 6.2)
- Chips: Fixture / stale / live · **SIMULATED** when telemetry is stubbed

**Visual:** `/cockpit` (laptop screenshot or Luke ref).

---

## Slide 6 — Operator surfaces (CLOUD-A2)

| Surface | What judges see | Honest note |
|---------|-----------------|-------------|
| Studio | Media preview + hook assist | Fixture entity LOG240 |
| Calendar | Caption / media / time slot | Enqueue is advanced |
| Reports | Narrative + 3 HUD charts | Raw JSON is advanced |
| Research | Readable cards + intel | Fixture topic |

---

## Slide 7 — Research intel (CLOUD-A3)

- Own-account outlier bar: **5× median** from `metric_facts`
- Demo fixture: **HIT999 — 5.5×** (600 vs 110)
- Caption hook 0–10 (mocked in fixture: 8.0)
- Weekly brief grounded in HIT999 — labeled mocked
- Competitor `@ride_lab_pro` = fixture; no live Graph scrape in this pack

**Do not chart invented engagement time-series.**

---

## Slide 8 — JARVIS voice + tools (Phase 11 + CLOUD-A4)

- PTT → STT → agent → cascaded TTS (sentence chunks)
- Barge-in stops playback and kills the run
- Read tools: cockpit, report, pipeline, outliers, weekly brief
- Write tools: enqueue, calendar, studio draft, research topic — **confirm first**
- Fail-safe: no mic → click Research (typed / click path). HUD has no typed composer.

**Do not claim:** measured &lt;1.2s first audio (laptop UAT only).

---

## Slide 9 — Demo beats + fail-safes

1. Command center (`/cockpit`)
2. “What’s the weekly brief?” **or** open Research
3. Studio → Calendar → Reports
4. HIT999 + close: we do not publish

Footer: `.\scripts\demo-start.ps1` · `ZEREF_BFF_FIXTURE=1`

---

## Slide 10 — Close / not in this build

**Shipped (Track A):** HUD, surfaces, research-lite, voice code, fixture demo, this pack.

**Not shipped (Track B — say it):**

- Meta publish + App Review
- Multi-tenant auth
- Next 16
- Live competitor Graph wave
- College **video** (laptop leftover)

**Last line:** Zeref is a JARVIS command center for Instagram growth — honest data, human approval, no fake publish.

---

## Optional extras (only if you need 11–12)

11. **Eval / verify** — phase gates 0–12 in CI; JARVIS eval 0 unsafe actions; fixture mocks (`ZEREF_LLM_MOCK`, `ZEREF_BFF_FIXTURE`).
12. **Q&A backup** — “Where is publish?” Track B. “Is HIT999 live?” No — fixture. “Can I type to Jarvis?” Click Research or `POST /api/v1/jarvis/run`; no HUD chat box yet.
