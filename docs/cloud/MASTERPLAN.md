# Zeref Masterplan — Cloud copy (Track A / B / C + Horizons)

**Source date:** 2026-09-10 · **Rebuilt:** 2026-09-26 (Track C + 8-month horizon, council 3-pass) for Grok Bot / Cloud Agents  
**Authoritative laptop plan:** user's Cursor plan `zeref_2026_masterplan` (local). **If conflict:** prefer this file for remote work scope; prefer [../CURRENT_STATE.md](../CURRENT_STATE.md) for what is already shipped.  
**Build plan + council review log:** [../superpowers/plans/2026-09-26-track-c-week1.md](../superpowers/plans/2026-09-26-track-c-week1.md)

---

## Scorecard

| Lens | Status |
|------|--------|
| Phases **0–12** | **APPROVED / frozen** — do not rebuild |
| Track A (college flash) | **DONE** (A0–A5) · LAPTOP-UAT leftovers |
| Track B (live Graph + competitor) | **DONE** (B0–B5) |
| Track C (build horizon, week 1) | **ACTIVE 2026-09-27** — [QUEUE.md](./QUEUE.md) |
| Seminar 1 (research + literature) | Pack ready — [../submission/seminar1/](../submission/seminar1/) |

---

## Tracks

**Track A — College flash (DONE)** — 6.2 HUD → product surfaces → research-lite → streaming-lite → submission pack.

**Track B — Live data (DONE)** — Graph setup, live collect, Business Discovery competitor, bulk freshness (B5).

**Track C — Build horizon (ACTIVE)** — everything decided after 2026-09-10 (seminar scope, 8-month plan, Jarvis memory vault, version packs). Fixture-safe, one card = one branch = one PR. Phase cards: `docs/cloud/phases/C*.md`.

---

## What changed on 2026-09-26 (scope delta)

Items that were not in this masterplan before, and where they now live:

| Item | Was | Now |
|------|-----|-----|
| CI red on `main` (Playwright `webServer` 120 s timeout) | unknown | **C0** (gate for all Track C) |
| Typed HUD composer (type to Jarvis, same confirm loop) | not planned | **C1** |
| Memory vault v0 — confirmed turns, rejections, corrections, pins; user can forget | not planned | **C3** |
| Pro charts v1 (trend line + own median) | not planned | **C6** |
| Confirm-gated cockpit collect button | voice only | **C2** |
| Semantic contradiction v1 (ZR-032) — *suspected*, never auto-overwrites | deferred | **C5** |
| Vector memory recall (11.x / G5) — hybrid lexical + vector (RRF), never vector-only | TRACK-B-DEFER | **C4** (week 2) |
| Jarvis version packs + human-only promotion gate + rollback | not planned | **C7** (week 2) |
| Vault UI panel, cited answers, fast/deep path | not planned | Horizon 2 |
| Streaming TTS + measured first-audio (P15) | phase-11 non-goal | Horizon 2 |
| Scheduled competitor refresh + watchlist vs own median (P13) | not planned | Horizon 2 |
| Morning brief, Critic seat veto, sticky corrections, replay, draft-from-pin | seminar ideas | Horizon 2 backlog |
| Auth / workspace boundary (P16a) | TRACK-B-DEFER | Horizon 3 |
| Confirm-gated publish + App Review packet (P16b, "review-pending" state) | TRACK-B-DEFER | Horizon 3 |
| Next 16 upgrade | TRACK-B-DEFER | Horizon 3 — **last** |
| Public SaaS, settings UI (G6), deploy hardening | stretch | Stretch |

**TRACK-B-DEFER is dissolved.** Each item is now a sequenced phase above. Anything not yet in [QUEUE.md](./QUEUE.md) with a card is still forbidden for workers.

---

## Track C — week 1 (Sun 2026-09-27 → Sat 2026-10-03)

**Re-planned 2026-09-28** after the PR #20 user-perspective review — see [week plan](../superpowers/plans/2026-09-28-week-plan.md) and [DEMO_SCRIPT](../demo/DEMO_SCRIPT.md). Lead runs agents locally (max 3, isolated worktrees).

```
Mon 28       Wave A: C0 round 2 (gate) || C1 typed composer || C3 memory vault   (C1/C3 merge after C0)
Tue–Wed      Wave B: D1 projector polish + report honesty || C6 pro charts || D2 Jarvis answers (after C1+C3)
Wed–Thu      Wave C: C2 cockpit collect (after D2) || C5 semantic contradiction (after C3)
Thu 1 Oct    Demo rehearsal x2 → merge freeze.  Cut order if late: C7 → C4 → C5 → C2 → C6 trend
```

| ID | Phase | Depends | Remote | Card |
|----|-------|---------|--------|------|
| CLOUD-C0 | CI green (Playwright webServer + DB test compose noise) | B5 merged | Yes | [phases/C0-ci-green.md](./phases/C0-ci-green.md) |
| CLOUD-C1 | Typed HUD composer + shared confirm card | C0 | Yes | [phases/C1-typed-composer.md](./phases/C1-typed-composer.md) |
| CLOUD-C3 | Memory vault v0 (reuse `memory_entries`, forget = confirm) | C0 | Yes (no migration) | [phases/C3-memory-vault.md](./phases/C3-memory-vault.md) |
| CLOUD-C6 | Pro charts v1 — per-post engagement trend + own median (new read-only trend route) | C0 | Yes | [phases/C6-pro-charts.md](./phases/C6-pro-charts.md) |
| CLOUD-D1 | Projector polish (no jargon, ≥13 px at 1080p) + report honesty (no fake VS bar) | C0 | Yes | [phases/D1-projector-polish.md](./phases/D1-projector-polish.md) |
| CLOUD-D2 | Jarvis answers with real fixture content + human confirm labels | C1, C3 | Yes | [phases/D2-jarvis-answers.md](./phases/D2-jarvis-answers.md) |
| CLOUD-C2 | Confirm-gated cockpit collect — Jarvis-only path, ADR-030 amendment | C1, C3, D2 | Yes (fixture) / live on laptop | [phases/C2-cockpit-collect.md](./phases/C2-cockpit-collect.md) |
| CLOUD-C5 | Semantic contradiction v1 (suspected) | C3 | Yes | [phases/C5-semantic-contradiction.md](./phases/C5-semantic-contradiction.md) |

## Track C — week 2 (cards ready, start after week 1 merges)

| ID | Phase | Depends | Card |
|----|-------|---------|------|
| CLOUD-C4 | Vector recall — migration `0006`, hybrid RRF, injected embedder | C3, C5 | [phases/C4-vector-recall.md](./phases/C4-vector-recall.md) |
| CLOUD-C7 | Jarvis version packs + human-only promotion gate + rollback | C3 | [phases/C7-version-packs.md](./phases/C7-version-packs.md) |

## What changed on 2026-09-30 (vision intake)

The operator's 14 ideas (special-code access, Iron Man visuals while Jarvis talks, 4-hourly watch, desktop + mobile, media, team Jarvis + Friday + Sunday, …) were ranked and placed by a 3-pass council: [../superpowers/plans/2026-09-30-vision-intake.md](../superpowers/plans/2026-09-30-vision-intake.md). Merges: C9 → C17a, C13 → C22b, C8 history + sticky corrections → C19. Own-account watch is **C18** (C11 stays competitor refresh). New safety prerequisite **K1** comes first.

## Horizons (cards written when the previous horizon is merged)

| Horizon | Window (sustainable pace) | Phases |
|---------|---------------------------|--------|
| **H2a — Jarvis feel** | Oct 2026 | C4 · C7 · **K1** kernel gate hardening (confirm bound to tool + args, unknown tools fail closed) · **C20a** CI split (< 20 min) · **C17a** fact cards as Jarvis speaks (absorbs C9) · C10 streaming TTS + first-audio metric (P15) · **C18** own-account watch every 4 h + on demand (opt-in, Graph budget, token alert, "what changed") · **R1** research spike (Obsidian, saved Jarvis apps — docs only) |
| **H2b — Smarter Jarvis** | Nov 2026 | **C17b** motion system · **C19** memory lifecycle (confirm-gated supersede, archive never delete; absorbs C8 history + sticky corrections) · C12 morning brief (fed by C18) · **C21** step-up code v0 (`sensitive` tier, typed code, never in model context) · **C22a** Team Jarvis: Jarvis + Friday (data/research) + Sunday (content) · **C22b** Critic veto (absorbs C13) · **W1** worker-only cloud host · C11 competitor refresh. Cut order: C11 → C22b → C12 → C17b |
| **H3 — Product boundary** | Dec 2026–Feb 2027 | C14 auth / workspace boundary (P16a) · **C23** flexible HUD · **C24a** Tauri desktop shell · **C27a** PWA mobile companion · C15 confirm-gated publish + App Review packet, "review-pending" until Meta approves (P16b) · **C25** approved Graph scopes, one card per scope (publish / replies / DMs = `sensitive`) · **C26** media store · **C20b** dead code + bundle budget · C16 Next 16 (last, after demo freeze) |
| **Stretch** | Mar–May 2027 | C24b desktop connected to cloud · C27b native mobile + push · **C28** local editing lab (ffmpeg on own media; recipes confirmed by the operator) · replay · draft-from-pin · public SaaS, G6 settings UI, deployment hardening, adapter fine-tune **only** behind the C7 promotion gate |

**Pace basis:** Sep 11–17 2026 shipped ~70 commits / PRs #2–#17 (~1 phase per day when the card is specified). Plan assumes one sprint-week every two weeks → full contract track lands late Jan–early Mar 2027, leaving ~3 months buffer before the 8-month mark.

---

## Jarvis self-improvement rules (non-negotiable)

- Jarvis "gets better" through **version packs** (persona + prompt + tool config), never unattended weight updates.
- A pack is promoted **only by a human** running `scripts/jarvis-promote.mjs --approve` on the laptop, after the eval harness passes (≥ 80 % task, ≥ 80 % tool choice, **0 unsafe**). Grok / CI / cron may only create candidates.
- A pack may never lower a tool's risk tier or remove a confirm gate. Rollback is one command.
- The memory vault stores what the user confirmed, rejected, corrected or pinned. The user can forget any item (hard delete, confirm-gated).
- Semantic contradiction only **flags** (`suspected`). It never overwrites a memory without the user.
- Sub-agents (Friday, Sunday) are read / draft only. Only the main Jarvis run calls write-high or `sensitive` tools, after confirm.
- Step-up codes are typed, checked outside the kernel, and never enter LLM messages, SSE, logs, the vault or audit args.

## Kill list (never do)

- Rewrite JARVIS onto LangGraph / Realtime-only tool loop
- Instagram scrape / personal accounts
- Next 16 before H3 / mid-demo
- Fake unlabeled fixture data as "live"; "semantic" claims from mock embeddings
- Vector-only memory search (always hybrid with lexical)
- Unattended self-modification (weights, prompts, risk tiers)
- Editing `eval/jarvis/golden-tasks.jsonl` without human sign-off
- Purple AI gradients / green CTA HUD swap
- Commit secrets
- Automate third-party apps with stored logins (CapCut, Instagram Edits, …)
- Spoken secrets as authentication
- Call Graph access "full access" — only approved scopes, each mapped to a tier

## Abstract (flash — finalized CLOUD-A5)

**Title:** ZEREF — An Autonomous JARVIS Command Center for Instagram Growth

Full text: [../submission/ABSTRACT.md](../submission/ABSTRACT.md). Do not invent a different product claim.

Zeref is a Luke-style JARVIS command center over an immutable Instagram ops pipeline (collect → normalize → embed → analyze → report). The cockpit is Studio, Calendar, Reports, and Research. JARVIS reads those surfaces and writes only after conversational confirm. College demo is fixture-honest (`Fixture` / `SIMULATED`). Meta publish is Horizon 3 and is **not** claimed.

**One line:** A JARVIS command center for Instagram growth ops — honest data, human approval, no fake live publish.

---

## Governance for remote agents

- One file, one owner — see root [AGENTS.md](../../AGENTS.md). Track C cards list owners; two active cards never share a file.
- Max **3** Grok chats at once, each on its **assigned** ID ([GROK.md](./GROK.md)).
- Workers write `docs/cloud/log/<ID>.md` only; the Planner owns QUEUE / AGENT_LOG / CURRENT_STATE.
- Council review mandatory for `packages/contracts/**`, `packages/db/**`, `apps/web/app/api/**`, `apps/worker/**`, kernel tool risk tiers.
- Verify: card's scoped tests + `npm run lint`; CI must be green on the PR (`gh pr checks`).
