# ADR-012: Analyze → report auto-chain and artifacts

**Status:** Accepted (Phase 4)

## Context

Phase 3 auto-chains normalize → embed. Phase 4 adds analyze → report.

## Decision

- After successful **analyze**, inline **report** when `ZEREF_AUTO_REPORT !== "0"`.
- One **report** job writes **`elite`** (required, C23) and optional **`jarvis_brief`** when `includeJarvisBrief` or `ZEREF_INCLUDE_JARVIS_BRIEF=1`.

## Consequences

- Separate `enqueue-report.mjs` remains for explicit runs.
- `ReportJobOutput.reportArtifactIds.elite` is always present.
