# Worker task cards queue — Zeref

Lead copies cards into **new** worker chats. Update status after each slice.

---

## COMPLETED — Phase 6 (APPROVED 2026-05-31)

Implementation @ `183acf9`; CI @ `d9c589f`; hotfixes `9c5869f` / `358d757`; screenshot @ `3020d1e`.

| Slice | Commit |
|-------|--------|
| P6-A Whisper | `7cd1f2b` |
| P6-B Kernel | `d1a1063` |
| P6-C BFF/Voice | `4171e14` |
| P6-E Docs/QA | `2cbe98b` |
| P6-D UI | `183acf9` |
| P6-HOTFIX-A | `9c5869f` |
| P6-HOTFIX-B | `358d757` |

---

## READY — Phase 7 Wave 1 (spawn P7-A only)

**Contract:** `docs/governance/phase-7-contract.md` **APPROVED WITH CONDITIONS** (Planner 2026-05-31)  
**ADRs:** ADR-025, ADR-026, ADR-027  
**Theme:** `packages/zeref-memory` — 4-tier brain (ZR-030–032)

**Order:** P7-A → (P7-B + P7-C + P7-E scaffold) → P7-D → P7-E finalize e2e

---

### Card P7-A — Agent Memory + Schema (Wave 1 — spawn NOW)

```text
You are the Zeref Memory + Schema agent for Phase 7 slice P7-A.

HARD RULE
- Implement ONLY: packages/zeref-memory/**, packages/contracts/src/phase7/**, packages/db migrations for memory tables, fixtures/phase-7/**, package.json workspace entries.
- Do NOT edit apps/web/**, packages/jarvis-kernel/**, scripts/worker.mjs, or BFF routes.
- When done, STOP and post a report. Do not claim Planner sign-off.

Skills — invoke before acting:
1. using-superpowers
2. test-driven-development
3. council-review-slice (schema changes)
4. verification-before-completion

Read first (mandatory):
1. docs/SKILL_INVOCATION.md
2. docs/CURRENT_STATE.md
3. docs/failures-checklist.md
4. docs/governance/phase-7-contract.md (Q1, C61–C64, Amendment B outbox table name)
5. docs/governance/adr/ADR-025-memory-postgres-schema.md
6. packages/db (existing migration pattern)
7. packages/contracts/src/phase6/ (pattern for phase7 schemas)

Repo: c:\Projects\zeref

Deliverables
1. packages/zeref-memory/ — package scaffold with:
   - saveMemory, searchMemory, verifyMemory
   - entity CRUD: createEntity, updateEntity, queryEntities, relateEntities
   - autoTierClassifier(text, context) → episodic|semantic|project|procedural
   - temporalScore(createdAt) — 30-day half-life
   - ruleBasedContradictionCheck on save (same entity_id + conflicting value → contradicted)
   - Postgres adapter + ZEREF_MEMORY_MOCK=1 in-memory/fixture adapter
2. packages/contracts/src/phase7/ — MemoryEntrySchema, MemorySearchResultSchema, MemoryEntitySchema, MemoryBrainEventSchema, CockpitSseOutboxSchema, PHASE7_CONTRACT_VERSION = "7.0.0"
3. packages/db migrations — memory_entries, memory_entities, memory_relations, memory_observations, cockpit_sse_outbox (for ADR-027; schema only — worker INSERT is P7-C scope)
4. fixtures/phase-7/ — sample memories + search results for mock mode
5. Unit tests — npm test -w @zeref/zeref-memory with ZEREF_MEMORY_MOCK=1

Allowed paths
- packages/zeref-memory/**
- packages/contracts/src/phase7/**
- packages/contracts/test/** (phase-7 tests)
- packages/db/** (memory + outbox migrations)
- fixtures/phase-7/**
- package.json / package-lock.json (workspace dep entries only)

Forbidden
- apps/web/**
- packages/jarvis-kernel/**
- scripts/**

Acceptance
- npm run build -w @zeref/contracts
- npm test -w @zeref/zeref-memory
- npm test -w @zeref/contracts (new phase-7 tests)
- Migration SQL applies (document manual: npm run db:migrate or project equivalent)

Report back: commit hash, API surface, migration file names, test output, env vars, blockers.
```

### Card P7-B — Agent Kernel (Wave 2 — after P7-A report)

```text
You are the Zeref Kernel agent for Phase 7 slice P7-B.
HARD RULE: packages/jarvis-kernel memory tools ONLY. Read P7-A API first.
Deliverables: memory_search, memory_save tools; Amendment C keyword routing; slow-path only.
Acceptance: npm test -w @zeref/jarvis-kernel with ZEREF_MEMORY_MOCK=1.
STOP with report.
```

### Card P7-C — Agent BFF + Outbox (Wave 2 — after P7-A report)

```text
You are the Zeref BFF agent for Phase 7 slice P7-C.
HARD RULE: BFF + worker outbox INSERT hook ONLY. No UI components.
Deliverables: getCockpitEventBus (Amendment A); memory.* SSE; cockpit_sse_outbox drain; worker job-complete INSERT.
Read ADR-027. Optional GET /api/v1/memory/search?q= read-only.
Acceptance: npm test -w @zeref/web.
STOP with report.
```

### Card P7-D — Agent UI Brain States (Wave 3 — after P7-B + P7-C)

```text
You are the Zeref UI agent for Phase 7 slice P7-D.
HARD RULE: globe + TelemetryStrip + e2e ONLY.
Deliverables: data-globe-brain-state; SSE memory.* subscription; jarvis-orb reaction mapping (no bloom).
Acceptance: manual + e2e with ZEREF_PHASE7_BRAIN=1 when P7-E ready.
STOP with report + screenshot.
```

### Card P7-E — Agent Docs/QA (Wave 2 scaffold → Wave 4 finalize)

```text
You are the Zeref Docs/QA agent for Phase 7 slice P7-E.
HARD RULE: scripts/verify-phase-7.mjs, CI, e2e, governance docs ONLY.
Wave 2: verify shell + CI step (Playwright may skip). Wave 4: cockpit-brain-7.spec.ts enforced.
Acceptance: npm run verify:phase-7 with ZEREF_MEMORY_MOCK=1 + ZEREF_PHASE7_BRAIN=1.
STOP with report.
```

---

## COMPLETED — P6-HOTFIX-A (audible TTS mock)

| Slice | Scope |
|-------|--------|
| P6-HOTFIX-A | `fixtures/phase-6/tts-mock.wav` 440 Hz tone; kernel RMS test; ADR-022/README note |

## COMPLETED — P6-HOTFIX-B (voice-routes fixture)

| Slice | Scope |
|-------|--------|
| P6-HOTFIX-B | `apps/web/test/voice-routes.test.mjs` audible `createMinimalWav()` + sync-mock RMS assertions @ `358d757` |

---

## READY — Phase 6 Wave 3 (P6-C + P6-E merged — spawn P6-D UI)

**Merged:** P6-C @ `4171e14`, P6-E @ `2cbe98b`  
**Order:** P6-D UI only → then enable `ZEREF_PHASE6_VOICE=1` in CI

---

### Card P6-A — Agent Whisper (run FIRST; parallel with B)

```text
You are the Zeref Whisper STT agent for Phase 6 slice P6-A.

HARD RULE
- Implement ONLY apps/whisper sidecar. No BFF, UI, or jarvis-kernel.
- When done, STOP and post a report. Do not claim Planner sign-off.

Skills — invoke before acting:
1. using-superpowers
2. test-driven-development
3. verification-before-completion

Read first:
- docs/SKILL_INVOCATION.md
- docs/CURRENT_STATE.md
- docs/failures-checklist.md
- docs/governance/phase-6-contract.md (Q1, C51)
- docs/governance/adr/ADR-020-whisper-stt-sidecar.md

Repo: c:\Projects\zeref

Deliverables
1. apps/whisper/ — Python faster-whisper sidecar
2. GET /health — { ok, model }
3. POST /v1/transcribe — multipart audio → { text, language?, durationMs? }
4. README — install, model download, start on 127.0.0.1:8765
5. Optional: docker-compose service snippet in docs (not required for CI)

Allowed paths
- apps/whisper/**
- docs/** (whisper section only)

Forbidden
- apps/web/**
- packages/jarvis-kernel/**
- packages/contracts/** (BFF/Kernel own schemas)

Acceptance
- curl health when sidecar running
- sample transcribe with tiny wav fixture (document manual step)
- Document ZEREF_WHISPER_MOCK=1 expectation for BFF (no sidecar in CI)

Report back: file list, curl samples, README path, blockers.
```

---

### Card P6-B — Agent Kernel (run FIRST; parallel with A)

```text
You are the Zeref Jarvis Kernel agent for Phase 6 slice P6-B.

HARD RULE
- Implement packages/jarvis-kernel + phase6 contracts only. No UI or whisper app.
- STOP with report when done.

Skills — invoke before acting:
1. using-superpowers
2. test-driven-development
3. council-review-slice (schema changes)

Read first:
- docs/SKILL_INVOCATION.md
- docs/governance/phase-6-contract.md (Q2–Q4, C52–C53, C56)
- docs/governance/adr/ADR-021-jarvis-kernel-two-phase-speak.md
- docs/governance/adr/ADR-022-elevenlabs-tts-mock.md

Repo: c:\Projects\zeref

Deliverables
1. packages/jarvis-kernel — processTurn() with fast Phase A ack (must NOT await full tool/LLM)
2. Two-phase speak: ackText (fast) + resultText (after tools/LLM)
3. Tool registry (Amendment B): get_cockpit_summary, get_latest_report_headline, get_pipeline_status
4. ElevenLabs TTS adapter + OpenAI fallback + ZEREF_TTS_MOCK=1 fixture audio
5. packages/contracts/src/phase6/ — JarvisTurn*, Voice* schemas incl VoiceAudioEventSchema, PHASE6_CONTRACT_VERSION
6. Unit tests — mock LLM + mock TTS; ack returns before slow path

Allowed
- packages/jarvis-kernel/**
- packages/contracts/src/phase6/**
- packages/contracts/test/** (phase-6 tests)
- fixtures/phase-6/**

Forbidden
- apps/web/components/**
- apps/whisper/** (P6-A)
- apps/worker/** job handlers

Acceptance
- npm run build -w @zeref/contracts
- npm test -w @zeref/jarvis-kernel (or package test script)
- npm test -w @zeref/contracts (new phase-6 tests)

Report back: commit hash, API surface, test output, env vars list.
```

---

### Card P6-C — Agent BFF/Voice (run AFTER A + B; parallel with E)

```text
You are the Zeref BFF/Voice agent for Phase 6 slice P6-C.

HARD RULE
- BFF routes + SSE extension + server lib only. No UI components.
- STOP with report when done.

Skills — invoke before acting:
1. using-superpowers
2. test-driven-development
3. council-review-slice

Read first:
- docs/governance/phase-6-contract.md (C54, C60, Amendment A)
- docs/governance/adr/ADR-024-live-sse-voice-events.md
- docs/governance/adr/ADR-019-telemetry-sse-stub.md
- apps/web/app/api/v1/events/stream/route.ts (extend, do not duplicate URL)
- packages/jarvis-kernel/src/process-turn.ts (processTurn / processTurnSync)
- docs/WHISPER_SIDECAR.md

Repo: c:\Projects\zeref

P6-B integration (binding):
- Add "@zeref/jarvis-kernel": "0.0.0" to apps/web/package.json (BFF routes only)
- Live: processTurn() → emit handle.ack + TTS ack on SSE immediately; await handle.complete in background
- CI mock (all flags): processTurnSync() → 200 JSON with both audio blobs
- defaultTtsAdapter(text, { phase: 'ack' | 'result' })
- Implement apps/web/lib/voice/voice-event-bus.ts (globalThis singleton pub/sub) so /voice/turn emits to open SSE clients

Deliverables
1. POST /api/v1/voice/turn — Amendment A:
   - Live/dev: 202 { turnId, transcript } after STT; ack+result via SSE (voice.audio, voice.transcript, voice.state)
   - CI mock: 200 sync JSON with both audio blobs when ZEREF_WHISPER_MOCK=1 + ZEREF_TTS_MOCK=1 + ZEREF_LLM_MOCK=1
2. GET /api/v1/voice/health — sidecar reachability + mock flags
3. Extend GET /api/v1/events/stream — subscribe to voice-event-bus + keep telemetry heartbeat
4. apps/web/lib/voice/** — whisper-client (127.0.0.1:8765 or WHISPER_MOCK), mock switches
5. Route handler tests with all mock flags

Allowed
- apps/web/app/api/v1/voice/**
- apps/web/app/api/v1/events/**
- apps/web/lib/voice/**
- apps/web/test/** (voice route tests)

Forbidden
- apps/web/components/**
- apps/whisper/** (except README cross-link)

Acceptance
- npm test -w @zeref/web (new voice tests)
- curl sample for /voice/turn with fixture audio in mock mode

Report back: routes, curl transcript, SSE sample lines, test output.
```

---

### Card P6-E — Agent Docs/QA (run parallel with C)

```text
You are the Zeref Docs/QA agent for Phase 6 slice P6-E.

HARD RULE
- verify script + CI + governance docs only. No apps/web/components/**.
- STOP with report when done.

Skills — invoke before acting:
1. using-superpowers
2. run-verify-gate
3. verification-before-completion

Read first:
- docs/governance/phase-6-contract.md (C59)
- scripts/verify-phase-5.1.mjs (pattern)
- docs/governance/adr/ADR-018-verify-phase-5-harness.md

Repo: c:\Projects\zeref

Deliverables
1. scripts/verify-phase-6.mjs — chain verify:phase-0 … verify:phase-5.1 + phase-6 checks
2. package.json — verify:phase-6 script
3. .github/workflows/ci.yml — Phase 0–6 gate; env: ZEREF_TTS_MOCK=1, ZEREF_WHISPER_MOCK=1, ZEREF_PHASE6_VOICE=1
4. apps/web/e2e/cockpit-voice-6.spec.ts — PTT + globe voice state (skip until ZEREF_PHASE6_VOICE=1)
   Document testid table for P6-D: ptt-button, audio-io-live, data-globe-voice-state, turnId optional
5. docs/governance/adr/README.md — Phase 6 ADR index
6. Update C30 guard in verify scripts: allow server-side jarvis-kernel; still forbid browser imports

Allowed
- scripts/verify-phase-6.mjs
- .github/workflows/ci.yml
- docs/governance/**
- package.json (verify script)
- apps/web/e2e/cockpit-voice-6.spec.ts

Forbidden
- apps/web/components/**

Acceptance
- node scripts/verify-phase-6.mjs (document pre-UI deferral if needed)

Report back: CI diff, verify output, C59 testid table for UI agent.
```

---

### Card P6-D — Agent UI (run AFTER C + E reports)

```text
You are the Zeref UI agent for Phase 6 slice P6-D.

HARD RULE
- PTT, live AUDIO I/O, globe voice states, Playwright only. Wire to BFF /voice/turn from P6-C.
- No OpenRouter in browser. STOP with report + screenshot.

Skills — invoke before acting:
1. using-superpowers
2. brainstorming
3. ui-ux-pro-max
4. test-driven-development
5. verification-before-completion

Read first:
- docs/design/reference/lukebuildsai-jarvis-hud.jpeg
- docs/governance/phase-6-contract.md (C55–C58)
- docs/governance/adr/ADR-023-globe-voice-states.md
- apps/web/components/hud/AudioIoPlaceholder.tsx (replace simulated path)
- apps/web/components/globe/GlobeIsland.tsx

Repo: c:\Projects\zeref

Deliverables
1. PttButton — data-testid=ptt-button, hold-to-talk, MediaRecorder → POST /api/v1/voice/turn
2. VoiceController — subscribe to SSE voice.audio (ack before result); playback order per Amendment A
3. Live AudioIO — mic level + output meter, data-testid=audio-io-live; hide audio-io-simulated when live
4. GlobeIsland/GlobeCanvas — data-globe-voice-state; thinking = opacity pulse only (ADR-023 Amendment C)
5. TelemetryStrip — remove SIMULATED when SSE live events received
6. Optional: conversation transcript panel under globe (ack + result lines)
7. apps/web/e2e/cockpit-voice-6.spec.ts + cockpit-layout updates per QA spec
8. docs/design/DESIGN_SYSTEM.md — voice UX notes

Allowed
- apps/web/components/**
- apps/web/app/cockpit/**
- apps/web/app/globals.css
- apps/web/e2e/**

Forbidden
- apps/web/app/api/** (BFF agent)
- packages/jarvis-kernel/** direct import in client components
- apps/whisper/**

Acceptance
- npm run verify:phase-6 with ZEREF_PHASE6_VOICE=1 + mock flags
- Playwright voice spec green

Report back: files changed, verify output, screenshot path, globe state demo notes.
```

---

## COMPLETED — Phase 6 Wave 2

| Slice | Scope |
|-------|--------|
| P6-C BFF/Voice | `/api/v1/voice/*`, SSE bus, `@zeref/jarvis-kernel` wiring |
| P6-E Docs/QA | `verify:phase-6`, CI Phase 0–6, `cockpit-voice-6.spec.ts` |

---

## COMPLETED — Phase 6 Wave 1

| Slice | Commit |
|-------|--------|
| P6-A Whisper | `7cd1f2b` |
| P6-B Kernel | `d1a1063` |

---

## COMPLETED — Phase 5.1

Planner approved; implementation @ `838e34d` + BFF/QA merges. See git log and `docs/CURRENT_STATE.md`.

<details>
<summary>Phase 5.1 cards (archived)</summary>

See git history @ `c40506a` for P5.1-A/B/C prompts.

</details>

---

## COMPLETED — Phase 5.0.x / Phase 5

See `docs/CURRENT_STATE.md` and git log @ `568a5fc`.

---

## Template (blank)

See [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md).
