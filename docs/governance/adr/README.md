# Architecture Decision Records

**Verification:** [verify.md](../verify.md)

## Phase 1 (contracts + snapshot DB)

**Contract:** [phase-1-contract.md](../phase-1-contract.md) (C1–C6)

| ADR | Topic | Owner |
|-----|--------|-------|
| [ADR-001](./ADR-001-snapshot-data-model.md) | Tables, FK graph, immutability triggers | Data |
| [ADR-002](./ADR-002-id-branding.md) | Branded UUID types in `@zeref/contracts` | API/Contracts |
| [ADR-003](./ADR-003-openapi-from-zod.md) | OpenAPI from Zod; CI derivation plan | API/Contracts |

**Reading order:** ADR-001 → ADR-002 → ADR-003

## Phase 2 (Instagram collect)

**Contract:** [phase-2-contract.md](../phase-2-contract.md) (Q1–Q4, C7–C10)  
**Legacy salvage:** [legacy-ios.md](../../handoff/legacy-ios.md) (merge-by-shortcode)

| ADR | Topic | Owner |
|-----|--------|-------|
| [ADR-004](./ADR-004-instagram-merge.md) | Merge-by-shortcode payload (Q1) | Scrape + API |
| [ADR-005](./ADR-005-worker-collect.md) | pg-boss collect + C8 dedupe (C9) | Worker |
| [ADR-006](./ADR-006-parse-fetch-live.md) | parse vs fetch vs live verify (Q3, C10) | QA |

**Reading order:** ADR-004 → ADR-005 → ADR-006

## Phase 3 (normalize + embed + pgvector)

**Contract:** [phase-3-contract.md](../phase-3-contract.md) (Q1–Q3, C11–C16)

| ADR | Topic | Owner |
|-----|--------|-------|
| [ADR-007](./ADR-007-embedding-provider.md) | Provider, dimensions (C16), CI mock (Q1) | Data |
| [ADR-008](./ADR-008-normalize-embed-chain.md) | Schema + normalize→embed auto-chain (Q2, Q3) | Data |
| [ADR-009](./ADR-009-worker-normalize-boundaries.md) | Normalize/embed boundaries, no re-scrape (C14) | Worker |
| [ADR-010](./ADR-010-verify-phase-3-harness.md) | verify harness, retrieval@3 (C15), CI mock embed (C13) | QA |

**Reading order:** ADR-007 → ADR-008 → ADR-009 → ADR-010

## Phase 4 (analyze + report)

**Contract:** [phase-4-contract.md](../phase-4-contract.md) (Q1–Q3, C17–C23)

| ADR | Topic | Owner |
|-----|--------|-------|
| [ADR-011](./ADR-011-openrouter-mock.md) | OpenRouter model + CI mock (Q1) | Reports |
| [ADR-012](./ADR-012-analyze-report-chain.md) | Auto-chain + artifact kinds (Q2, Q3) | Worker |
| [ADR-013](./ADR-013-analyze-report-boundaries.md) | No instagram in analyze/report (C19) | Worker + QA |
| [ADR-014](./ADR-014-verify-phase-4.md) | verify:phase-4 harness (C20–C22) | QA |

**Reading order:** ADR-011 → ADR-012 → ADR-013 → ADR-014

## Phase 5 (cockpit UI shell)

**Contract:** [phase-5-contract.md](../phase-5-contract.md) (Q1–Q3, C24–C30)  
**Legacy salvage:** [legacy-ios.md](../../handoff/legacy-ios.md) (cockpit layout + BFF)

| ADR | Topic | Owner |
|-----|--------|-------|
| [ADR-015](./ADR-015-globe-performance.md) | Globe perf budget, client island (Q1) | UI |
| [ADR-016](./ADR-016-bff-cockpit-slices.md) | BFF placement, slices + artifact routes (Q2) | API |
| [ADR-017](./ADR-017-cockpit-routes-layout.md) | Routes, responsive panel grid (Q3) | UI |
| [ADR-018](./ADR-018-verify-phase-5-harness.md) | Playwright cockpit-layout harness (C28) | QA |

**Reading order:** ADR-015 → ADR-016 → ADR-017 → ADR-018

## Phase 5.1 (Luke JARVIS HUD fusion)

**Contract:** [phase-5.1-contract.md](../phase-5.1-contract.md) (C43–C50)

| ADR | Topic | Status | Owner |
|-----|--------|--------|-------|
| [ADR-015 amendment](./ADR-015-amendment-phase-5.1.md) | Point-cloud globe + full-bleed hero (C44–C45) | **APPROVED** | UI |
| [ADR-019](./ADR-019-telemetry-sse-stub.md) | SSE telemetry stub + SIMULATED badge (C47) | **APPROVED** | BFF/Events |
| [ADR-018](./ADR-018-verify-phase-5-harness.md) | Extended by `verify:phase-5.1` (C48–C49) | Accepted | QA |

**Reading order:** ADR-015 amendment → ADR-019 → ADR-018 (5.1 extension)

## Phase 6 (Jarvis voice)

**Contract:** [phase-6-contract.md](../phase-6-contract.md) (Q1–Q5, C51–C60)

| ADR | Topic | Status | Owner |
|-----|--------|--------|-------|
| [ADR-020](./ADR-020-whisper-stt-sidecar.md) | faster-whisper sidecar (Q1, C51) | **APPROVED** | Whisper |
| [ADR-021](./ADR-021-jarvis-kernel-two-phase-speak.md) | kernel + two-phase speak (Q3–Q4, C52) | **APPROVED** | Kernel |
| [ADR-022](./ADR-022-elevenlabs-tts-mock.md) | ElevenLabs + `ZEREF_TTS_MOCK` (Q2, C53) | **APPROVED** | Kernel |
| [ADR-023](./ADR-023-globe-voice-states.md) | globe voice states (C57) | **APPROVED** | UI |
| [ADR-024](./ADR-024-live-sse-voice-events.md) | live SSE + VoiceAudioEvent (Q5, Amendment A) | **APPROVED** | BFF |
| [ADR-018](./ADR-018-verify-phase-5-harness.md) | Extended by `verify:phase-6` (C59) | Accepted | QA |

**Reading order:** ADR-020 → ADR-021 → ADR-022 → ADR-023 → ADR-024 → ADR-018 (6 extension)

**Status:** **APPROVED** (Planner 2026-05-31)

## Phase 7 (zeref-memory + event→orb)

**Contract:** [phase-7-contract.md](../phase-7-contract.md) (Q1–Q5, C61–C70, Amendments A–D)

| ADR | Topic | Status | Owner |
|-----|--------|--------|-------|
| [ADR-025](./ADR-025-memory-postgres-schema.md) | Postgres 4-tier memory schema (Q1, C63) | **APPROVED** | Data |
| [ADR-026](./ADR-026-kernel-memory-tools.md) | Kernel memory tools, slow-path only (Q2, C65) | **APPROVED** | Kernel |
| [ADR-027](./ADR-027-sse-brain-events-outbox.md) | SSE brain events + worker outbox (Q3, Q5, C66–C69) | **APPROVED** | BFF + Worker |

**Reading order:** ADR-025 → ADR-026 → ADR-027

**Status:** **APPROVED WITH CONDITIONS** (Planner 2026-05-31) — spawn P7-A after Lead commits contract.

## Planner quick reference

| ID | ADR / doc |
|----|-----------|
| C1–C6 | Phase 1 — ADR-001, ADR-002, verify `phase-1` |
| Q1 | ADR-004 — one merged row per shortcode |
| Q2 | ADR-004 — Graph MVP fields |
| Q3 | ADR-006 — no Playwright in CI |
| Q4 | ADR-005 — CLI enqueue only |
| C7 | `@zeref/contracts` — `CollectJobOutput`, `PHASE2_CONTRACT_VERSION` |
| C8 | ADR-005 — dedupe returns existing `snapshotId` |
| C9 | ADR-005 — worker registry collect-only |
| C10 | ADR-006 + verify.md — CI runs `verify:phase-2` |
| C11 | `@zeref/contracts` — Phase 3 job I/O, `PHASE3_CONTRACT_VERSION` |
| C12 | ADR-009 — worker registry collect+normalize+embed |
| C13 | ADR-010 + verify.md — CI runs `verify:phase-3` |
| C14 | ADR-009 + verify script grep — no `@zeref/instagram` in normalize/embed |
| C15 | ADR-010 — retrieval@3 ≥ 1.0 on `fixtures/phase-3/retrieval/` |
| C16 | ADR-007 — `vector(1536)` locked in migration |
| C17 | `@zeref/contracts` — Phase 4 job I/O, `PHASE4_CONTRACT_VERSION` |
| C18 | ADR-013 — worker registry five jobs |
| C19 | ADR-013 + verify:phase-4 — no `@zeref/instagram` in analyze/report |
| C20 | ADR-014 — elite golden + citation lint |
| C21 | ADR-014 + verify.md — CI runs `verify:phase-4` |
| C22 | ADR-014 — verify:phase-3 relaxed registry count |
| C23 | ADR-012 — elite artifact always written |
| C24 | `@zeref/contracts` — `CockpitSlicesSchema`, `PHASE5_CONTRACT_VERSION` |
| C25 | ADR-017 — top nav Cockpit \| Settings only |
| C26 | ADR-015/017 — 4 panels + center globe layout |
| C27 | ADR-016/017 — RSC `getCockpitSlices()`, BFF in `apps/web` |
| C28 | ADR-018 + verify.md — Playwright in CI |
| C29 | ADR-016 — report artifact detail by ID (read-only) |
| C30 | ADR-015/018 — no voice/STT/TTS in Phase 5 web |
| C43–C48 | Phase 5.1 — ADR-015 amendment, ADR-019, `verify:phase-5.1` Playwright C48 |
| C49 | ADR-018 extension + verify.md — CI runs `verify:phase-5.1` after `verify:phase-5` |
| C50 | C30 carry-forward — no voice in Phase 5.1 web |
| C51–C58 | Phase 6 — ADR-020–024, BFF voice routes, Playwright C59 testids |
| C59 | ADR-018 extension + verify.md — `verify:phase-6` chains 0–5.1; server-only jarvis-kernel guard |
| C60 | ADR-020–024 — no browser API keys; honest SSE |

## Related

- [Phase 0 contract](../phase-0-contract.md)
- [Legacy handoff](../../handoff/legacy-ios.md)
