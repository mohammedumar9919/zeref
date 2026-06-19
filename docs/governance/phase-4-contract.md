# Zeref — Phase 4 Contract (Implementation)

**Phase:** 4  
**Status:** **APPROVED** (Planner sign-off; tip `dc2adb1`)  
**Theme:** Analyze + report engine (elite JSON + cited narrative)

**Prerequisites:** Phases 0–3 approved (`verify:phase-3` green; tip `6b5e60b`).

---

## Planner decisions (binding)

### Open questions (Q1–Q3)

| # | Decision |
|---|----------|
| **Q1** | OpenRouter default **`openai/gpt-4o-mini`** for report narrative; CI **`ZEREF_LLM_MOCK=1`** only (no network). **ADR-011**. |
| **Q2** | One **`report` job** → **`elite`** row (required) + optional **`jarvis_brief`** row; same `analysis_output_id`. |
| **Q3** | Auto-chain report after analyze unless **`ZEREF_AUTO_REPORT=0`**. **ADR-012**. |

### Conditions (C17–C23)

| ID | Condition |
|----|-----------|
| **C17** | `AnalyzeJobOutput` + `ReportJobOutput` in `@zeref/contracts`; export **`PHASE4_CONTRACT_VERSION`**. |
| **C18** | Worker **pipeline-stage** registry: **`collect`**, **`normalize`**, **`embed`**, **`analyze`**, **`report`** (+ `research` from C83) — no stub types. **Amended (Phase 12 C165):** operator jobs (e.g. `schedule-collect`) form a separate **operator-job category** outside the frozen pipeline stages; `verify:phase-4` checks pipeline stages + known operator jobs, not a fixed total count. |
| **C19** | **`analyze` and `report` must NOT import `@zeref/instagram`**; `verify:phase-4` enforces (C14-style). |
| **C20** | Elite report golden JSON in **`fixtures/phase-4/elite/`**; narrative citations reference **`metric_facts`**. |
| **C21** | CI runs **`npm run verify:phase-4`** after `verify:phase-3` (same implementation wave). |
| **C22** | **`verify:phase-3`** registry check relaxed (requires collect+normalize+embed; does not require exactly 3 jobs). Full 5-job registry enforced in **`verify:phase-4`**. |
| **C23** | **`elite`** artifact row is **always** written by report handler; `jarvis_brief` optional only. |

**Data agent:** SKIP (no migration unless blocker).

---

## Goals

1. **`analyze` worker handler** — reads `normalized_entities`, `metric_facts`, `embedding_vectors` by ID (no collectors); writes **`analysis_outputs`**; cohort comparison via `@zeref/analytics` / `@zeref/reports`.
2. **`report` worker handler** — reads **`analysis_outputs`** by ID; OpenRouter narrative (mocked in CI); writes **`report_artifacts`** (`elite` required + optional `jarvis_brief`).
3. **`packages/reports`** — elite report shape, citation builder, narrative template; evolve legacy ios ideas with tests (`docs/handoff/legacy-ios.md`).
4. **Contracts** — `AnalyzeJobOutput`, `ReportJobOutput`, `EliteReportSchema`, `PHASE4_CONTRACT_VERSION`.
5. **`npm run verify:phase-4`** — golden elite JSON, citation rules, handler integration, C19 guard.
6. **CI** — Phase 0–4 gate (C21).

---

## Non-goals (out of scope)

| Area | Notes |
|------|--------|
| Cockpit UI / report rendering | Phase 5 |
| Jarvis voice / STT / TTS | Phase 6+ |
| Collectors / scrape / Graph changes | Bugfix only |
| `@zeref/instagram` in analyze/report | Forbidden (C19) |
| Live OpenRouter in CI | `ZEREF_LLM_MOCK=1` only |
| pgvector / new tables | Phase 3 done; Data agent SKIP |

---

## Pipeline (Phase 4 adds)

```
collect → normalize → embed → analyze → report
                              ^^^^^^^^   ^^^^^^
                              Phase 4    Phase 4
```

### Analyze job behavior

1. Validate `AnalyzeJobInput` (immutable IDs only).
2. **SELECT** upstream rows: `normalized_entities`, `metric_facts`, optional `embedding_vectors`.
3. Run analytics: engagement, niche, cohort comparison.
4. Build `analysis_outputs.payload_json` (structured, not LLM prose).
5. Honor **`insufficient_data`** — propagate, do not invent metrics.
6. **INSERT** `analysis_outputs` (append-only).
7. Return **`AnalyzeJobOutput`**.
8. Optional auto-chain report (Q3).

### Report job behavior

1. Validate `ReportJobInput` (`analysisOutputId` primary).
2. **SELECT** `analysis_outputs` + joined `metric_facts`.
3. Build **elite** JSON via `@zeref/reports`.
4. Call **OpenRouter** (or mock) for cited narrative.
5. **INSERT** `report_artifacts`: **`elite` always (C23)**; **`jarvis_brief`** when requested (Q2).
6. Return **`ReportJobOutput`**.

---

## Elite report shape (rewrite from legacy — not copy)

Reference: legacy ios `jarvis_analyze` / report synthesis (`instagram-ops-studio`, read-only).

**Citation rules (C20):** Every numeric claim in `narrative.markdown` must appear in `citationIndex` with `metricFactId` or declared `insufficient_data`.

---

## Contracts (C17)

- **`AnalyzeJobOutput`:** `{ analysisOutputId, normalizedEntityId?, snapshotId?, insufficientData? }`
- **`ReportJobOutput`:** `{ reportArtifactIds: { elite, jarvisBrief? }, analysisOutputId }`
- **`EliteReportSchema`** Zod
- **`PHASE4_CONTRACT_VERSION`** = `"4.0.0"`

---

## Verify: `npm run verify:phase-4`

| Check | Requirement |
|-------|-------------|
| C17 | PHASE4 exports + job I/O |
| C18 | Pipeline stages present (collect/normalize/embed/analyze/report + research) + known operator jobs (schedule-collect); see C18 amendment |
| C19 | No `@zeref/instagram` in analyze/report paths |
| C20 | Golden elite + citation lint |
| C21 | Integration + LLM mock |
| C22 | verify:phase-3 still passes with 5-job registry |
| C23 | Report tests assert elite row always created |

**CI:** **Phase 0–4 gate**; `verify:phase-4` after phase-3.

---

## ADRs (Phase 4)

| ADR | Topic |
|-----|--------|
| ADR-011 | OpenRouter model + mock (Q1) |
| ADR-012 | Auto-chain analyze→report (Q3), artifact kinds (Q2) |
| ADR-013 | No instagram in analyze/report (C19) |
| ADR-014 | verify:phase-4 harness (C20) |

---

## Acceptance criteria

- Q1–Q3 and C17–C23 satisfied.
- `verify:phase-0` through `verify:phase-4` green locally + CI.
- No Cockpit, Jarvis voice, or report UI.
