# Vision intake — 14 operator ideas → masterplan (2026-09-30)

**Status:** v2 FINAL (council pass 1 lead draft → pass 2 Seat A engineering/security + Seat B product/delivery → pass 3 lead rebuild)  
**Input:** operator's 14 ideas, [MASTERPLAN](../../cloud/MASTERPLAN.md), code on `main` after C0/C1/D1 merges.  
**Rule:** week 1 is unchanged (demo rehearsal Thu 1 Oct, merge freeze). Nothing here starts before the rehearsal passes.

## 1. The ideas

| # | Idea (operator) |
|---|-----------------|
| 1 | Sensitive / hidden data only after a special code followed by a second code — a "code conversation" |
| 2 | While Jarvis talks, details pop up on screen like Iron Man (metrics → visuals + facts; research → examples) |
| 3 | Instagram access like Grok Bot; sensitive actions need another code exchange |
| 4 | Research: Obsidian vault; Jarvis-style apps saved on Instagram |
| 5 | Very smooth screen transitions, no mechanical feel |
| 6 | Flexible, not rigid UI — like Iron Man's Jarvis |
| 7 | Access photos/videos, try editing, learn editing (Instagram Edits / CapCut), store the knowledge |
| 8 | Later: a mobile app to always talk to, like Siri |
| 9 | Budget-friendly monitoring: every 4 h on its own, plus on demand |
| 10 | Web for now; main version = desktop app connected to the cloud |
| 11 | Good storage for photos/videos (a drive) |
| 12 | Learns, and replaces outdated learning |
| 13 | Lean code, not bulky |
| 14 | A team: main Jarvis + Friday + Sunday |

## 2. Where each idea stands today

| # | State | Evidence |
|---|-------|----------|
| 1 | Partial | Write-high tools confirm-gated (`jarvis-kernel/src/core/permissions.ts`). No step-up code, no `sensitive` tier. |
| 2 | Partial | HUD already receives every agent step live (`agent.step` SSE → `VoiceProvider`). Tool results are not drawn as cards. |
| 3 | Partial | Graph read: media, insights, Business Discovery (B0–B5). Publish = C15 (H3). Comments / DMs not built. |
| 4 | None | — |
| 5 | Partial | P6.2 visual tier; route changes are hard cuts. |
| 6 | Partial | Fixed 4-panel grid + workspace routes. |
| 7 | None | — |
| 8 | None | — |
| 9 | Mostly built | `apps/worker/src/boss.ts` schedules collect every `ZEREF_COLLECT_INTERVAL_HOURS` (default 6); on demand = C2. Missing: daily Graph budget, double-schedule guard, token-expiry alert, "what changed" diff, always-on host. |
| 10 | None | Web only. |
| 11 | None | — |
| 12 | Partial | C3 vault (pins, corrections, forget), C5 suspected contradictions, temporal score. No supersede / archive lifecycle. |
| 13 | Ongoing | CI 51 min in one job; dead `CockpitShell.tsx`; no bundle budget. |
| 14 | Partial | Critic seat planned (C13). Kernel runs one agent. |

## 3. Final importance order

| Rank | Idea | Phase(s) | When |
|-----:|------|----------|------|
| 0 | safety prerequisite (found in review) | **K1** kernel gate hardening | H2a |
| 1 | 2 — visuals while Jarvis talks | **C17a** fact cards (absorbs C9 cited answers) | H2a |
| 2 | 9 — 4-hourly watch + on demand | **C18** own-account watch; **W1** worker cloud host | H2a / H2b |
| 3 | 13 — lean code | **C20a** CI split (target < 20 min) · C20b dead code + bundle budget | H2a / H3 |
| 4 | 5 — smooth transitions | **C17b** motion system | H2b |
| 5 | 12 — replace outdated learning | **C19** memory lifecycle (absorbs sticky corrections + C8 history view) | H2b |
| 6 | 1 — special-code conversation | **C21a** PIN + `sensitive` tier · **C21b** voice challenge · C21c `classified` (see §6) | H2b / H3 |
| 7 | 14 — Jarvis + Friday + Sunday | **C22a** delegation + personas · **C22b** Critic (absorbs C13) | H2b |
| 8 | 4 — research | **R1** spike (docs only, 1 day) | H2a, parallel |
| 9 | 6 — flexible UI | **C23** flexible HUD | H3 |
| 10 | 10 — desktop + cloud | **C24a** Tauri shell (local) → C24b cloud-connected | H3 / Stretch |
| 11 | 3 — wider Instagram access | **C25** approved Graph scopes, one card per scope | H3 |
| 12 | 11 — media storage | **C26** media store | H3 |
| 13 | 8 — mobile | **C27a** PWA companion → C27b native + push | H3 / Stretch |
| 14 | 7 — editing | **C28** local editing lab (reframed) | Stretch |

Streaming TTS (**C10**, already in H2) moves up to H2a: fast voice matters as much as cards for the Jarvis feel.

## 4. Phase definitions

### H2a — October (after the demo)

| ID | Phase | Ideas | Depends | Council |
|----|-------|-------|---------|---------|
| C4, C7 | Week-2 cards (vector recall; version packs) — unchanged | — | C3, C5 | yes |
| **K1** | Kernel gate hardening: a confirm is bound to `{runId, toolName, argsHash}` and used once (today one `confirmed: true` approves every write-high call in the run); unknown tools fail closed (today `descriptor?.riskTier ?? "read"`) | 1, 14 prereq | — | yes (kernel tiers) |
| **C20a** | Split CI into parallel jobs; target < 20 min | 13 | — | — |
| **C17a** | Fact cards appear as Jarvis speaks: rendered from `agent.step` tool results; only tool-returned values; Fixture/SIMULATED badges; field whitelist per tool; eval check "no number on a card that is not in a tool result" | 2 | D2 | yes (contract) |
| **C10** | Streaming TTS + first-audio metric (existing) | 2 | — | — |
| **C18** | Own-account watch: opt-in; every 4 h (configurable) + on demand (C2); daily Graph call cap + back-off on usage headers; one schedule only; token-expiry alert (60-day tokens); audit row per run; "what changed" diff stating when data was collected. Interim always-on: laptop Task Scheduler. | 9 | C2 | yes (worker) |
| **R1** | Research spike → `docs/research/R1-*.md`: Obsidian (one-way export vs sync, how forget propagates, local-only); saved Jarvis-style apps (operator supplies 5–8 links — Graph cannot read saved collections; nothing scraped); UI patterns for C17/C23; ends in go/no-go + draft cards | 4 | — | — |

### H2b — November

| ID | Phase | Ideas | Depends | Council |
|----|-------|-------|---------|---------|
| **C17b** | Motion system: route + panel transitions, reduced-motion respected, no layout jank | 5 | C17a | — |
| **C19** | Memory lifecycle: supersede only through a confirm-gated "replace this?" turn; old entry archived (`superseded_by`), never deleted; batch "archive stale?" proposal; history view; sticky corrections. **Open decision for operator:** today the exact same-key rule auto-marks the old value `contradicted` (see §6). | 12 | C4, C5 | yes (db) |
| **C12** | Morning brief, fed by the C18 "what changed" diff | 9 | C18 | — |
| **C21a–b** | Step-up codes v0 (single operator until C14 auth; layered design in §6): new `sensitive` tier above write-high; typed PIN in a masked field plus the voice challenge (C21b), checked by an API route outside the kernel — never in LLM messages, SSE, logs, vault or audit args; argon2id hash in a local secrets store (never env/git); 5-min elevated session that does **not** replace per-call confirm; 15-min lockout after 5 failures; audit unlock/fail/lockout; tier map is code-owned — packs cannot lower it (eval case); sensitive results redacted from SSE/cards | 1, 3 | K1, C17a | yes (kernel + api) |
| **C22a** | Team Jarvis v1 inside `jarvis-kernel` (no LangGraph): Jarvis orchestrates and is the only run allowed write-high/sensitive tools; **Friday** = data + research (read-only); **Sunday** = content + drafts (read + draft); sub-agent output treated as untrusted; shared step budget; new golden handoff cases need human sign-off | 14 | K1, C19 | yes (kernel) |
| **C22b** | Critic seat with veto (absorbs C13) | 14 | C22a | yes |
| **W1** | Worker-only cloud host: no inbound web port, managed Postgres, secrets in host vault, existing `boss.schedule`, daily Graph cap | 9, 10 | C18 | yes (worker) |
| **C11** | Scheduled competitor refresh + watchlist (existing), shares the C18 budget guard | 9 | C18 | yes |

**Cut order if behind (first cut first):** C11 → C22b → C12 → C17b move to H3.

### H3 — December–February

C14 auth / workspace boundary · **C23** flexible HUD (panels arrange around the topic) · **C24a** Tauri desktop shell over the local app · **C27a** PWA mobile companion (install, mic, watch alerts) after C14 · C15 confirm-gated publish + App Review packet · **C25** approved Graph scopes, one card per scope (comments first); publish, comment replies and DMs are `sensitive`; unapproved scopes show "review-pending"; never called "full access" · **C26** media store (Drive vs R2 decided in-card; own media only) · **C20b** dead code + bundle budget · C16 Next 16 last.

C24 and C27 each carry a threat model: tokens in the OS keychain, transport to cloud, depends on C14 + C21.

### Stretch — March–May 2027

C24b desktop connected to cloud · C27b native mobile + push · **C28** local editing lab: ffmpeg on the operator's own media (C26); editing "knowledge" = recipes the operator confirms or pins (vault) or a human-promoted version pack; **no logins into CapCut / Instagram Edits, no UI automation** · replay · draft-from-pin · public SaaS.

## 5. Rule changes (added to MASTERPLAN)

- Kill list: automating third-party apps with stored logins (CapCut, Instagram Edits, …); a spoken phrase as the **only** factor; calling Graph access "full access".
- Self-improvement: sub-agents (Friday, Sunday) never call write-high or sensitive tools; only the main Jarvis run does, after confirm.
- Honesty: scheduled collect is opt-in and audited; fact cards show only tool-returned values with their data-source badge.

## 6. Operator decisions (answered 2026-09-30)

1. **Exact-rule contradiction (C19): keep automatic.** Stating a new value for the same thing (posting time 7pm → 9pm) still marks the old one `contradicted` without asking — it is the operator's own correction. C19 must keep the old value visible in the history view (it already stays in the DB). Only *suspected* (semantic) matches and stale-archive proposals ask first.
2. **Step-up codes (C21): PIN + authenticator code + a movie-style voice challenge, in two levels.** Design below.
3. **Cloud host (W1): decide when C18 lands;** the monthly cost cap is the main rule.

### C21 design after decision 2 — layered codes

| Level | Unlocks | Operator must give |
|-------|---------|--------------------|
| `sensitive` | hidden data, publish / replies / DMs (C25), media (C26) | voice challenge set 1 **and** typed PIN |
| `classified` | the most sensitive items (operator marks which) | voice challenge sets 1 **and** 2 **and** authenticator (TOTP) code |

**Voice challenge ("double-meaning" exchange):** the operator says a cover phrase; Jarvis answers with a cover question; the operator gives the answer phrase. Two independent sets exist for `classified`.

Rules that keep it safe (Seat A's concerns still hold — speech can be overheard or recorded):
- A voice challenge is **never the only factor**: `sensitive` always also needs the typed PIN, `classified` also needs TOTP.
- The challenge is matched **before** the transcript reaches the LLM, the SSE stream, logs, the vault or audit args. Matching turns are replaced by `[challenge]` in every transcript; Jarvis's cover question is spoken from a local table, not generated by the model.
- Phrases, PIN and TOTP secret are stored only as hashes (argon2id; TOTP secret encrypted) in a local secrets store — never env, git, fixtures or eval files.
- Normalised matching (case, punctuation, filler words) on the Whisper transcript; a wrong answer counts as a failed attempt (15-min lockout after 5).
- Elevation lasts 5 min (`sensitive`) / 2 min (`classified`), is bound to the session, and never replaces the per-action confirm.
- Operator can rotate any phrase, PIN or TOTP from a confirm-gated settings flow; rotation needs the current `classified` unlock.
- Version packs cannot change levels, phrases or the tier map.

**C21 is now three cards** (too big for one): **C21a** `sensitive` tier + typed PIN + elevation/lockout/audit (needs K1) · **C21b** voice challenge-response with pre-LLM interception + transcript redaction · **C21c** `classified` level: second challenge set + TOTP. C21a–b stay in H2b; C21c moves to H3 (nothing classified exists before C25/C26).

## 7. Council log

### Pass 1 — lead draft
Mapped all 14 ideas to current code and plan; ranked; proposed C17–C28, R1, expanded C11.

### Pass 2 — two seats

**Seat A (engineering / security)** — BLOCK C21, C25, C28 as written:
- BLOCKER: one confirm approves every write-high call in the run (`permissions.ts` takes one boolean) → new **K1** before C21/C22. Lead verified in code.
- BLOCKER: unknown tools default to `read` in `react-loop.ts` → K1 fails closed. Lead verified.
- BLOCKER: spoken passphrase is overheard/recorded and lands in transcripts and LLM context → C21 typed code, server-side check, never in model context.
- BLOCKER: logging into CapCut / Edits breaks their terms and stores passwords → C28 reframed.
- BLOCKER: "full access like Grok Bot" impossible under kill list; each Graph scope needs App Review → C25 per approved scope.
- MAJOR: tool results stream in full → C17a whitelist, C21 redaction.
- MAJOR: exact rule auto-marks `contradicted` → C19 + operator decision §6.1.
- MAJOR: C11 already means competitor refresh → own-account watch renamed **C18**.
- MAJOR: C22 split; sub-agents read/draft only; depends on K1.

**Seat B (product / delivery)** — proceed with fixes:
- BLOCKER: H2 overloaded (~18 cards for ~14 slots) → merges below + cut order.
- MAJOR: duplicates — C9 into C17a, C13 into C22b, sticky corrections + C8 history into C19, watch diff feeds C12.
- MAJOR: split C17 (cards / motion), C22 (team / critic), C24 (shell / cloud), C20 (CI / code), C25 (per scope).
- MAJOR: C21 too early for a single-user app with no sensitive data yet → H2b, framed as step-up, not security, until C14.
- MAJOR: idea 9 needs an always-on host before H3 → **W1** worker-only host in H2b; interim Task Scheduler.
- MAJOR: honesty — opt-in, audited schedule; cards show tool values only.
- MINOR: PWA before native; Tauri shell needs no cloud; R1 deliverable defined; C20 measurable target; C10 moved up.

### Pass 3 — lead rebuild
Folded every BLOCKER and MAJOR. Resolved the one disagreement (C21 timing): Seat A wanted K1 first, Seat B wanted C21 later — both satisfied by K1 in H2a and C21 in H2b. Checked no two cards in the same wave share hot files: K1 (`permissions.ts`, `react-loop.ts`) ∥ C17a (HUD cards, `VoiceProvider`) ∥ C18 (worker schedule) ∥ C20a (`.github/workflows`).
