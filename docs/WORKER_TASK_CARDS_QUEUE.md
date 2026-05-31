# Worker task cards queue — Zeref

Lead copies cards into **new** worker chats. Update status after each slice.

---

## READY — Phase 6 (Discuss + Contract DRAFT — spawn after Planner approval)

**Prerequisite:** Phase 5.1 Planner sign-off recommended.  
**Order:** P6-A + P6-B parallel → P6-C + P6-E parallel → P6-D UI

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
1. packages/jarvis-kernel — processTurn(), read-only tool registry
2. Two-phase speak: ackText (fast) + resultText (after tools/LLM)
3. ElevenLabs TTS adapter + OpenAI fallback + ZEREF_TTS_MOCK=1 fixture audio
4. packages/contracts/src/phase6/ — JarvisTurnInput/Output, VoiceEvent schemas, PHASE6_CONTRACT_VERSION
5. Unit tests — mock LLM + mock TTS paths

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
- docs/governance/phase-6-contract.md (C54, C60)
- docs/governance/adr/ADR-024-live-sse-voice-events.md
- docs/governance/adr/ADR-019-telemetry-sse-stub.md
- apps/web/app/api/v1/events/stream/route.ts (extend, do not duplicate URL)

Repo: c:\Projects\zeref

Deliverables
1. POST /api/v1/voice/turn — audio → whisper (or WHISPER_MOCK) → kernel → TTS (or TTS_MOCK)
2. GET /api/v1/voice/health — sidecar + mock flags status
3. Extend GET /api/v1/events/stream — voice.state, voice.transcript events
4. apps/web/lib/voice/** — proxy helpers, mock switches
5. Route handler tests with ZEREF_WHISPER_MOCK=1 + ZEREF_TTS_MOCK=1

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
2. VoiceController hook — globe state + audio playback (ack then result)
3. Live AudioIO — mic level + output meter, data-testid=audio-io-live; hide audio-io-simulated when live
4. GlobeIsland/GlobeCanvas — data-globe-voice-state idle|listening|thinking|speaking (ADR-023)
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
