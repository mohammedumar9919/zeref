# CLOUD-C1 — Typed HUD composer + shared confirm card

- Agent: cursor-worker (laptop worktree)
- Branch: cloud/c1-typed-composer
- PR: see PR "feat(hud): CLOUD-C1 typed composer + confirm card" (merges after PR #20)
- Status: PR_READY

## Done
- `lib/jarvis/typed-turn.ts` — `sendTypedTurn(transcript)` / `confirmTypedTurn(transcript, runId)` POST `/api/v1/jarvis/run` with a fresh uuid `turnId`; confirm adds `confirmed: true` + `runId`; non-2xx throws with the server `error` string. Exports `TYPED_TURN_ERROR_COPY` ("Jarvis couldn't answer — try again") and `TYPED_TURN_CANCEL_COPY` ("Cancelled — nothing queued.").
- `components/hud/ConfirmCard.tsx` — props `{ pending, onApprove, onCancel, busy, label? }`; title = `label` or tool name; short args summary; Confirm / Cancel; testids `confirm-card`, `confirm-card-approve`, `confirm-card-cancel`. No risk tier shown (PendingConfirm has none; kernel descriptors are not imported client-side).
- `components/hud/TypedComposer.tsx` — input + Send, Enter to send, disabled while running or while a confirm is pending; renders ConfirmCard for `pendingConfirm`. Confirm re-POSTs only on the explicit click; Cancel makes no network call and appends "Cancelled — nothing queued.". Errors show friendly copy; raw server error only in `console.error` and the `title` attribute. Input text 16 px (`text-base`). Cyan/void HUD tokens only.
- `components/voice/VoiceProvider.tsx` — `TranscriptLine.source` (`voice` | `typed`), `appendTypedTranscript` on the context; transcript ids now use a monotonic counter (old `prev.length` ids could collide once the list hit its 21-line cap).
- `components/voice/TranscriptPanel.tsx` — same list for voice + typed; `data-transcript-role` / `data-transcript-source`; "typed" marker on typed user lines.
- `components/hud/VoiceHudShell.tsx` — mounts `TypedComposer` at the end of the HUD content area.

## Tests
- `node --import tsx --test test/typed-turn.test.mjs` — red first (module missing), then 7/7 pass.
- `npm run build` — pass; `npm run lint` (tsc -b) — pass.
- `npm test -w @zeref/web` — 139 tests, 138 pass, 1 skipped, 0 fail.
- Playwright (fixture + phase flags, server on port 3117 with `ZEREF_PLAYWRIGHT_REUSE=1`) `cockpit-composer-c1 jarvis-agent-11 cockpit-voice-6 cockpit-hud-6.1`: **12 passed, 1 failed**.
  - cockpit-composer-c1: 3/3 pass (Enter + typed marker + reply + 16 px font at 1920×1080; ConfirmCard Cancel sends no `confirmed:true` and shows no job result, then Confirm re-POSTs `confirmed:true` + `runId` and shows "Job enqueued successfully."; 500 shows friendly copy with raw error only in `title`).
  - jarvis-agent-11 3/3, cockpit-voice-6 3/3, cockpit-hud-6.1 3/4.
  - Failure (outside this card): `cockpit-hud-6.1` C91 expects header text "Phase 6.1", but `lib/phase-marker.ts` renders `Phase ${PHASE10_CONTRACT_VERSION major}` ("Phase 10"). Stale assertion on `main`; C1 changes nothing in the header. Owner: D1 (`phase-marker.ts`) / QA.

## Deviations / notes
- Placement: the composer sits directly **above** the transcript strip, not below it. `TranscriptPanel` is mounted by `HudFooter.tsx` (D1-owned) and `VoiceHudShell` can only add content inside `HudShell`'s content area (HudShell is also off-limits this wave). Moving it under the transcript is a one-line change in `HudFooter` for D1.
- Local Playwright: `next start --port 3000` in `apps/web/package.json` ignores `PLAYWRIGHT_PORT`, so the Playwright webServer timed out on this (heavily loaded) machine; I started `next start --port 3117` manually and reused it.

## Laptop follow-up
- Projector check at 1920×1080; screenshot for seminar deck (not taken).
