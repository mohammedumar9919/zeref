# Zeref — Gap Backlog

**Reconciled:** 2026-05-30 against repo + portable agent stack audit  
**Source:** Phase contracts, legacy-ios handoff, Luke HUD reference, prior Planner audit

---

## Status legend

| Status | Meaning |
|--------|---------|
| **DONE** | Shipped and verify-green |
| **PARTIAL** | Started; gap remains |
| **OPEN** | Not started |
| **DEFER** | Post Phase 6+ |

---

## P0 — Ops and truthfulness

| ID | Item | Status | Notes |
|----|------|--------|-------|
| ZR-001 | Worker daemon consumes pg-boss queue | **DONE** | `scripts/worker.mjs`, `npm run dev:worker` |
| ZR-002 | `dev:stack` / `dev:clean` scripts | **DONE** | `scripts/dev-stack.mjs`, `dev-clean.mjs` |
| ZR-003 | `run-pipeline.mjs` one-command full pipeline | **DONE** | `npm run pipeline:run` |
| ZR-004 | BFF error surfaced in UI (not silent empty) | **DONE** | `CockpitBffError` + `cockpit/error.tsx` |
| ZR-005 | CI BFF test against real Postgres | **OPEN** | Phase 5 uses `ZEREF_BFF_FIXTURE=1` only |
| ZR-006 | Portable agent stack fully committed | **PARTIAL** | git commit pending |

---

## P1 — Phase 5.1 Luke JARVIS HUD

| ID | Item | Status | Notes |
|----|------|--------|-------|
| ZR-010 | Point-cloud globe + compass rings | **OPEN** | ADR-015 forbids particles today |
| ZR-011 | Full-bleed hero globe (≥45vh, no panel box) | **OPEN** | |
| ZR-012 | Luke-style HUD chrome (header chips, footer objective) | **OPEN** | Keep 4 product panels inside glass columns |
| ZR-013 | Telemetry strip (real pipeline SSE) | **OPEN** | Not fake logs |
| ZR-014 | AUDIO I/O waveform placeholder | **OPEN** | Wire in Phase 6 |
| ZR-015 | Conversation dock under globe | **OPEN** | |
| ZR-016 | `verify:phase-5.1` or extend phase-5 | **OPEN** | |
| ZR-017 | Reference JPEG in git | **PARTIAL** | File exists locally; commit pending |

---

## P2 — Phase 6 voice

| ID | Item | Status | Notes |
|----|------|--------|-------|
| ZR-020 | `apps/whisper` STT sidecar | **OPEN** | Master plan; not scaffolded |
| ZR-021 | `packages/jarvis-kernel` tools + TTS | **OPEN** | |
| ZR-022 | ElevenLabs British Jarvis TTS primary | **OPEN** | Planner decision; not in contract |
| ZR-023 | Two-phase speak (ack then result) | **OPEN** | |
| ZR-024 | Globe states idle/listening/thinking/speaking | **OPEN** | |
| ZR-025 | `ZEREF_TTS_MOCK=1` for CI | **OPEN** | |
| ZR-026 | SSE `/api/v1/events` job + voice events | **OPEN** | Luke jarvis-orb pattern |

---

## P3 — Memory and intelligence (Phase 7+)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| ZR-030 | `packages/zeref-memory` 4-tier memory | **DEFER** | Luke jarvis-orb brain |
| ZR-031 | Event→orb mapping sub-100ms | **DEFER** | |
| ZR-032 | Contradiction detection | **DEFER** | |

---

## P4 — Docs and governance

| ID | Item | Status | Notes |
|----|------|--------|-------|
| ZR-040 | Master plan stale (embed, 5.1, voice) | **OPEN** | Planner `.cursor/plans/` file |
| ZR-041 | `.planning/PROJECT.md` REQUIREMENTS ROADMAP | **PARTIAL** | STATE only existed |
| ZR-042 | Multi-agent HARD RULE in repo governance | **PARTIAL** | Council rules pending |
| ZR-043 | `packages/domain` stub or remove | **OPEN** | |
| ZR-044 | HTTP API to enqueue jobs from UI | **OPEN** | CLI only since Phase 2 |

---

## Completed (Phases 0–5)

| ID | Item | Status |
|----|------|--------|
| ZR-100 | Monorepo scaffold + CI verify chain | **DONE** |
| ZR-101 | Snapshot immutability + Instagram collect | **DONE** |
| ZR-102 | normalize → embed chain | **DONE** |
| ZR-103 | analyze → report + elite JSON | **DONE** |
| ZR-104 | Cockpit shell + BFF + Playwright | **DONE** |
