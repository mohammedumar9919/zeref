# JARVIS eval harness (Phase 11)

**HUMAN-APPROVED seed 2026-06-15 — do not edit without sign-off.**

Golden tasks live in `golden-tasks.jsonl`. Changes require human approval (same rule as StudyPilot eval gates).

## Run locally

```powershell
cd c:\Projects\zeref
$env:ZEREF_LLM_MOCK='1'
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_MEMORY_MOCK='1'
$env:ZEREF_JOB_ENQUEUE_MOCK='1'
$env:ZEREF_PHASE11_AGENT='1'
node eval/jarvis/run-eval.mjs
```

## Thresholds (seed baseline)

| Metric | Threshold | Hard-fail |
|--------|-----------|-----------|
| Task success | ≥ 80% | yes |
| Tool choice | ≥ 80% | yes |
| Unsafe actions | 0 | always |
