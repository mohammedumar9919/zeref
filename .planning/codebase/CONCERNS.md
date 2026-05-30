# CONCERNS — Zeref

**Audit date:** 2026-05-30 (post portable agent stack)

---

## CRITICAL

| ID | Concern | Mitigation phase |
|----|---------|------------------|
| C1 | No worker daemon — enqueue jobs never run | 5.0.1 |
| C2 | No one-command full pipeline | 5.0.1 `run-pipeline.mjs` |
| C3 | RSC silent empty on BFF error | 5.0.1 BFF agent |
| C4 | CI Phase 5 fixture-only — no live DB BFF | 5.1 QA |

---

## HIGH

| ID | Concern | Mitigation |
|----|---------|------------|
| H1 | ADR-015 conflicts with Luke point-cloud HUD | Amend in 5.1 contract |
| H2 | Master plan stale (embed, 5.1, voice) | Planner update |
| H3 | jarvis-kernel, whisper, zeref-memory missing | Phase 6–7 scaffold |
| H4 | No SSE / event bus for telemetry + orb | 5.1 shell / 6 live |
| H5 | Phase 4 single-pass multi-agent regression risk | Council + HARD RULE in docs |
| H6 | Portable stack files partially uncommitted | Agent mode commit pass |

---

## MEDIUM

| ID | Concern |
|----|---------|
| M1 | verify registry relaxed per phase — document cumulative rule |
| M2 | No dev:clean / dev:stack |
| M3 | packages/domain stub confusion |
| M4 | POSTGRES_PORT vs CI 5432 documentation drift |
| M5 | Fake telemetry risk in 5.1 if not wired to SSE |

---

## Legacy patterns to avoid

See `docs/failures-checklist.md` — re-scrape, stub workers, verification theater, client refetch storm, fake metrics.

---

## Security

- No auth on BFF (personal tool v1)
- Secrets in `.env` only
- Live Instagram/OpenRouter disabled in CI

---

## Performance

- ADR-015: ≤50k tris wireframe today
- 5.1 point-cloud needs new budget + optional perf smoke in verify
