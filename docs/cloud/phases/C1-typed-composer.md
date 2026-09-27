# CLOUD-C1 — Typed HUD composer + shared confirm card

**Queue ID:** CLOUD-C1  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Yes (fixture)  
**Depends on:** CLOUD-C0 merged  
**Branch prefix:** `cloud/c1-`  
**Phase flags:** `ZEREF_PHASE11_AGENT=1 ZEREF_PHASE51_UI=1 ZEREF_PHASE6_VOICE=1`

## Goal

Today the HUD only takes push-to-talk. Add a **typed composer** so the operator (and the projector demo) can type to Jarvis, using the **same agent path and confirm loop** as voice. Build the confirm UI as a reusable component — CLOUD-C2 will reuse it.

## Existing code to reuse (do not duplicate)

- `POST /api/v1/jarvis/run` — body `{ turnId: uuid, transcript: string, confirmed?: boolean, runId?: uuid }` (`apps/web/app/api/v1/jarvis/run/route.ts`). Response from `runJarvisAgent` (`apps/web/lib/jarvis/agent-runtime.ts`) includes `resultText` and, when a write-high tool needs approval, `pendingConfirm` + `runId` (terminal reason `awaiting_confirm`).
- Confirm = re-POST `{ turnId: <new uuid>, transcript: <same>, confirmed: true, runId }`.
- HUD shell: `apps/web/components/hud/VoiceHudShell.tsx`; transcript: `apps/web/components/voice/TranscriptPanel.tsx`; provider: `apps/web/components/voice/VoiceProvider.tsx`.
- Existing agent e2e: `apps/web/e2e/jarvis-agent-11.spec.ts` (shows the awaiting_confirm flow).

## Allowed paths

- `apps/web/components/hud/TypedComposer.tsx` (create) — input + send button, Enter to send, disabled while running, `data-testid="typed-composer"`, `typed-composer-input`, `typed-composer-send`
- `apps/web/components/hud/ConfirmCard.tsx` (create) — renders a `pendingConfirm` (`{ toolName, args }`; the response carries `runId` at top level) as tool name + short args summary with **Confirm** / **Cancel**. `PendingConfirm` has no risk tier field; if you show one, look it up from the kernel tool descriptors; `data-testid="confirm-card"`, `confirm-card-approve`, `confirm-card-cancel`. Props: `{ pending, onApprove, onCancel, busy }`
- `apps/web/lib/jarvis/typed-turn.ts` (create) — `sendTypedTurn(transcript)` and `confirmTypedTurn(transcript, runId)` → `fetch('/api/v1/jarvis/run')`; returns parsed result; throws on non-2xx with the server `error` string
- `apps/web/components/hud/VoiceHudShell.tsx` — mount the composer under the transcript
- `apps/web/components/voice/TranscriptPanel.tsx` — show typed turns with a "typed" marker (same list as voice)
- `apps/web/components/voice/VoiceProvider.tsx` — only if needed to append typed lines to the shared transcript state
- `apps/web/test/typed-turn.test.mjs` (create), `apps/web/e2e/cockpit-composer-c1.spec.ts` (create)
- `docs/cloud/log/CLOUD-C1.md` (create)

## Forbidden

- New BFF routes or changes under `apps/web/app/api/**`
- `apps/web/components/cockpit/**` (C2 owns cockpit panels)
- `apps/web/lib/jarvis/llm-port.ts`, kernel packages (C3 owns)
- Auto-confirm, "remember my choice", or any path that executes write-high without the Confirm click
- Purple gradients; keep cyan/void HUD tokens (`hud-cyan`, `hud-border`, `hud-surface`)

## Tests (write first)

1. `typed-turn.test.mjs` (node --test, mock `globalThis.fetch`):
   - sends `{turnId, transcript}` with a uuid `turnId`
   - `confirmTypedTurn` sends `confirmed: true` and the given `runId`
   - non-2xx throws with the server `error` text
2. `cockpit-composer-c1.spec.ts` (Playwright, fixture + mocks; `test.skip` unless `ZEREF_PHASE11_AGENT=1` — CI's Phase 5 step runs the whole e2e suite without that flag):
   - type "show me the cockpit dashboard" → Enter → transcript shows the typed line and a Jarvis reply
   - type "enqueue a report job" → `confirm-card` visible → Cancel → no job result text; repeat → Confirm → result text appears

## Verify

```bash
# repo root
export ZEREF_BFF_FIXTURE=1 ZEREF_LLM_MOCK=1 ZEREF_MEMORY_MOCK=1 ZEREF_JOB_ENQUEUE_MOCK=1 ZEREF_TTS_MOCK=1 ZEREF_WHISPER_MOCK=1 ZEREF_PHASE11_AGENT=1 ZEREF_PHASE51_UI=1 ZEREF_PHASE6_VOICE=1
npm run build && npm run lint
npm test -w @zeref/web
npm -w @zeref/web run test:e2e:install
npm -w @zeref/web run test:e2e -- cockpit-composer-c1 jarvis-agent-11 cockpit-voice-6
```

## Acceptance

- [ ] Typed and voice turns share one transcript
- [ ] Write-high tools always stop at `ConfirmCard`
- [ ] Existing voice + agent e2e still green; CI green

## Laptop follow-up

- Projector check: composer readable at 1080p; screenshot for seminar deck.
