# Seminar 1 — brief lock

**Locked from:** `docs/superpowers/plans/2026-09-22-seminar-1-zeref.md`  
**Date locked:** 2026-09-22

## Operator identity

| Field | Value |
|---|---|
| Project title | ZEREF — An Autonomous JARVIS Command Center for Instagram Growth |
| Student | Mohammed Umar Salam |
| Roll number(s) | REQUIRED |
| Guide / supervisor | REQUIRED |
| Department | Computer Science Engineering (confirm official string) |
| Institution | REQUIRED |
| Semester / year | 7th semester, 2026–27 |
| Presentation date | REQUIRED |
| Horizon | Contract track ~March 2027; vault March–May 2027 |

## Problem statement (freeze — do not paraphrase on Slide 14)

Existing dashboards, engagement models, tool-using agents, paged-memory agents, and feedback-tuned models do not give a creator one system that analyzes an Instagram account, keeps the operator’s confirmed corrections, and acts only with a human yes. Zeref already collects an immutable snapshot, labels data age, briefs the operator, and blocks draft, calendar, and enqueue writes until a person confirms. Inside the months the September pace supports, this project will add semantic recall, charted reports, polished streaming speech, a login that isolates a second local user, and a publish path that either waits for confirmation or stops in a visible review-pending state. If that track is demonstrable, the same project will add a memory vault of confirmed turns and corrections, and a versioned Jarvis that replaces the live agent only when the evaluation still shows no unsafe write, with rollback to the previous version. Weight updates are not part of the first vault release. The measurable tests are: meaning-based recall of an earlier post; a second user who cannot read the first user’s snapshot; a publish attempt that cannot look successful while review is pending; and a candidate Jarvis version that stays offline when the safety check fails.

## Objectives (fifteen)

### Already met

1. Implemented the snapshot pipeline and the four cockpit surfaces.
2. Implemented confirm-gated writes for enqueue, calendar, and studio draft, with an audit row.
3. Implemented data-age badges and live collect for the operator account.
4. Implemented competitor discovery and reel-idea suggestions.

### Contract track (~March 2027)

5. Implement vector recall and extend contradiction detection beyond the same-key rule.
6. Design and implement report charts that keep the fixture / stale / live label.
7. Optimise speech to the streaming path and evaluate first-audio time only by measuring it.
8. Implement a typed ask on the same agent path, and a cockpit collect that still requires confirm.
9. Implement login and validate isolation of a second local user.
10. Implement confirm-gated publish and prepare the App Review packet. Evaluate the review-pending state.
11. Validate the Next 16 upgrade on the existing verify chain after the above is demonstrable.

### Second horizon (March–May 2027, after 11)

12. Implement the vault: confirmed turns, rejections, corrections, pins, and delete.
13. Design a version pack cut only from those corrections, and validate that it cannot replace the live agent when the eval reports an unsafe write. Rollback is part of the test.
14. Implement cited speech, a fast path and a deep path, and a Critic seat that can veto a write.
15. Implement a read-only morning brief and a watchlist against this account’s own median.

## Hard claims

- Publish appears only as confirm-gated or review-pending.
- Vault and version packs are not already built.
- Weights do not update in the background.
- No invented first-audio latency.
- No claim that Meta App Review is already granted.
