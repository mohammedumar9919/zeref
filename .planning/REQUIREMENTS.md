# Zeref — REQUIREMENTS

Derived from phase contracts 0–5 and Planner master plan. Full detail in `docs/governance/phase-*-contract.md`.

---

## Functional

| ID | Requirement | Phase | Status |
|----|-------------|-------|--------|
| R1 | Immutable Instagram snapshots per collect | 2 | DONE |
| R2 | mergeByShortcode Graph/scrape precedence | 2 | DONE |
| R3 | Five job types: collect/normalize/embed/analyze/report | 2–4 | DONE |
| R4 | Elite report JSON with citations | 4 | DONE |
| R5 | Cockpit BFF slices + artifact detail route | 5 | DONE |
| R6 | Wireframe globe client island | 5 | DONE (superseded by 5.1 visual) |
| R7 | Worker daemon + one-command pipeline | 5.0.1 | OPEN |
| R8 | Luke JARVIS HUD visual parity | 5.1 | OPEN |
| R9 | Real telemetry SSE (no fake logs) | 5.1 | OPEN |
| R10 | PTT voice + Jarvis TTS | 6 | DEFER |
| R11 | zeref-memory 4-tier brain | 7+ | DEFER |

---

## Non-functional

| ID | Requirement | Status |
|----|-------------|--------|
| N1 | `verify:phase-N` in CI | DONE 0–5 |
| N2 | No re-scrape downstream | DONE |
| N3 | BFF-only browser API | DONE |
| N4 | Playwright cockpit layout in CI | DONE |
| N5 | Multi-agent separate chats (5.1+) | POLICY |
| N6 | Globe perf budget (ADR-015) | PARTIAL |
| N7 | Honest empty/error states | OPEN (ZR-004) |

---

## Out of scope (v1)

- Multi-tenant auth
- Public deployment hardening
- Live Instagram in CI
