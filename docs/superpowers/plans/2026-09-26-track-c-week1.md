# Track C — Week 1 build plan (Grok Bot) — v3 FINAL

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans per phase card (TDD, frequent commits). One card = one branch = one PR. Operating rules: [docs/cloud/GROK.md](../../cloud/GROK.md).

**Goal:** Turn everything decided since the 2026-09-10 masterplan (seminar scope, 8-month horizon, Jarvis memory vault, version packs) into buildable, fixture-safe phases Grok Bot can run **Sun 2026-09-27 → Sat 2026-10-03**, with week 2 queued.

**Architecture:** Phases 0–12 stay frozen. Track C slices live in `docs/cloud/phases/C*.md`, each owning a disjoint file set within its wave. Memory goes through `@zeref/zeref-memory` on the existing `memory_entries` table; UI through `apps/web/components/**`; Jarvis self-improvement through eval-gated, human-promoted version packs (no weight training).

**Tech stack:** Next.js 15.5 BFF, pg-boss worker, Postgres 16 + pgvector (1536-d), `node --test`, Playwright, Drizzle SQL migrations.

**Authoritative outputs:** [MASTERPLAN.md](../../cloud/MASTERPLAN.md) (scope delta + horizons) · [QUEUE.md](../../cloud/QUEUE.md) · [GROK.md](../../cloud/GROK.md) · cards C0–C7.

---

## Final phase set

| Wave | ID | Phase | Depends | Council |
|------|----|-------|---------|---------|
| 0 | C0 | CI green (Playwright `webServer` timeout; DB test compose noise) | B5 ✅ | yes |
| 1 | C1 | Typed HUD composer + shared `ConfirmCard` | C0 | — |
| 1 | C3 | Memory vault v0 on `memory_entries` (`source='vault'`), forget = confirm | C0 | yes |
| 1 | C6 | Per-post engagement trend + own median (new read-only route) | C0 | yes |
| 2 | C2 | Cockpit collect via Jarvis confirmed write-high only (ADR-030 amendment) | C1, C3 | yes |
| 2 | C5 | Semantic contradiction v1 — flags `suspected`, never overwrites | C3 | — |
| wk 2 | C4 | Vector recall — migration 0006, hybrid RRF, injected embedder | C3, C5 | yes |
| wk 2 | C7 | Version packs + human-only promotion gate + rollback | C3 | yes |

Same-wave file overlap: **none** (pass 3 verified). Shared `packages/contracts/src/index.ts` is split by block: C3 → phase7 block, C6 → new phase14 block appended at end.

---

## Council review log

### Pass 1 — v1 draft (8 phases, one-line table) → **REJECTED**

Seats: Data / Worker / Security · Lead / UI / Grok-operability.

| Finding | Fix in v2 |
|---------|-----------|
| No phase cards; zero-context agent can't execute | Cards C0–C7 in B5 format (allowed / forbidden / tests / verify) |
| Parallel PRs all edit QUEUE.md + AGENT_LOG.md → conflicts | Workers write `docs/cloud/log/<ID>.md`; Planner owns QUEUE / AGENT_LOG |
| "Take first OPEN row" breaks with 3 parallel chats | Assigned ID per chat + draft-PR claim + `gh pr list` check (GROK.md) |
| C0 base unclear; PR #18 unmerged | Fixed #18's stale voice test, merged #18; C0 branches from main |
| Wrong HUD path; C1 & C2 share `VoiceHudShell` | C1 owns hud files; C2 reuses, may not edit |
| C2 would duplicate confirm logic | C2 goes through Jarvis `enqueue_job` write-high |
| Vault as new table = dual memory store | Reuse `memory_entries`, `source='vault'` + `metadata_json.kind` |
| `memory_save` is `read` tier but writes | Set to `write-low` |
| C4 vector-only risk, mock "semantic" claims, stores in append-only `embedding_vectors`, imports `apps/worker` | Hybrid RRF; own table with cascade; injected embedder via shared package; no semantic claims |
| C5 parallel with C3 in same package; auto-overwrite risk | C5 after C3; suspected-only |
| C7 could edit eval harness; promotion not human-only | Harness read-only; `--approve` + TTY + not-CI; candidates only for Grok |
| 8 phases too many for a week | 6 in week 1; C4 / C7 to week 2 |

### Pass 2 — v2 cards → C0 ✅ · C5 ✅ · C1 / C4 / C7 CONCERN · **C3 / C2 / C6 BLOCK**

| Finding (verified in code) | Fix in v3 |
|----------------------------|-----------|
| C3: `MemorySourceSchema` lacks `vault` → Zod rejects saves | Add `'vault'` in `phase7/memory.ts` (allowed path) |
| C3: FK facts — `entry_id` CASCADE, `superseded_entry_id` SET NULL | Card states actual FK behaviour |
| C3: `metadata_json.kind` not a typed column | Filter `source='vault'` in SQL, kind in JS |
| C2: ADR-030 excludes `collect` from `UiJobTypeSchema`; `enqueueJob` parses before mock | Option A: `JarvisJobTypeSchema` + `enqueueJob(body, {via:'jarvis-confirmed'})` only from `zeref-context.ts`; ADR-030 amendment; UI route unchanged |
| C6: elite artifact has no per-post time series | New contract `phase14/engagement-trend.ts` + read-only `GET /api/v1/reports/engagement-trend`, fixture file, RSC load |
| C1: `PendingConfirm` has no risk tier; e2e must skip without flag (CI Phase 5 runs full suite) | Card corrected; flag-gated `test.skip`; full env in Verify |
| C4: analytics needs `@zeref/db` dep; web needs analytics; `embed` should be optional | Package deps allowed; `opts?.embed` |
| C7: eval prints text, not JSON; seed tiers unspecified; don't wire packs into executor | Regex parse + exit code; v1 mirrors current tiers; audit stamp only |
| GROK prompt: opaque card path, missing env / e2e install | §6 rewritten |
| C0: job named "0–9" but runs 10–12 | Card says whole job must pass |

### Pass 3 — v3 → C1 / C3 / C5 ✅ · C2 / C6 CONCERN (text fixes) → **applied → FINAL**

| Finding | Fix |
|---------|-----|
| C2: Jarvis schema must keep `research` when `ZEREF_PHASE9_RESEARCH=1` | Pick V9 vs phase-8 base at call site |
| C2: `buildWorkerJobPayload` has no `collect` case (non-mock path) | Allowed to add it via `CollectJobInputSchema` |
| C6: page loads data, hub renders | Both `page.tsx` and `ReportsHub.tsx` allowed |
| C6: e2e can't show insufficient state with ≥ 6-point fixture | Covered by unit test instead |
| C6: fixture folder naming | `fixtures/phase-14/` |

---

## Planner / laptop duties this week

1. After each merge: QUEUE `DONE`, flip dependents `NEXT → OPEN`, AGENT_LOG summary from `docs/cloud/log/<ID>.md`, CURRENT_STATE line.
2. Merge order: C0 → (C1, C3, C6) → (C2, C5). Council review before merging C0, C3, C6, C2.
3. Laptop checks per card "Laptop follow-up" (live vault voice test, live collect, live trend).
4. Human-only: sign off proposed golden tasks; later `jarvis-promote.mjs --approve` (C7).
5. Leftover: LAPTOP-UAT video + Luke screenshot; seminar slide 1 identity fields.
