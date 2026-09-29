# Zeref demo script (fixture mode, 1920×1080)

**Owner:** human presenter. **Rehearse:** Thu 1 Oct, twice. Pass = every step shows the expected result; no dev jargon; no invented numbers.

## Launch (PowerShell, repo root)

```powershell
$env:ZEREF_BFF_FIXTURE="1"; $env:ZEREF_LLM_MOCK="1"; $env:ZEREF_MEMORY_MOCK="1"; $env:ZEREF_JOB_ENQUEUE_MOCK="1"; $env:ZEREF_TTS_MOCK="1"; $env:ZEREF_WHISPER_MOCK="1"
$env:ZEREF_PHASE51_UI="1"; $env:ZEREF_PHASE6_VOICE="1"; $env:ZEREF_PHASE61_UI="1"; $env:ZEREF_PHASE62_UI="1"; $env:ZEREF_PHASE7_BRAIN="1"; $env:ZEREF_PHASE10_OPS="1"; $env:ZEREF_PHASE8_PRODUCT="1"; $env:ZEREF_PHASE9_RESEARCH="1"; $env:ZEREF_PHASE11_AGENT="1"; $env:ZEREF_PHASE12_DATA="1"
npm run build; npm -w @zeref/web run start -- --hostname 127.0.0.1 --port 3000
```

Browser: `http://127.0.0.1:3000/cockpit`, full screen (F11), zoom 100 %.

## Steps

| # | Do | Expect on screen | Card |
|---|----|------------------|------|
| 1 | Open `/cockpit` | Header chip `FIXTURE` (not `PHASE 10`); globe; telemetry "Pipeline idle" + `SIMULATED` | D1 |
| 2 | Type in composer: `what is the latest report headline` | Reply quotes the fixture headline text | C1, D2 |
| 3 | Type: `how did my last post do compared to my usual` | Score vs baseline; "low confidence" if baseline < 5 posts | D2 |
| 4 | Open Reports → latest artifact | "In line with your usual"-style chip (no numeric VS bar); "Facts cited: N"; trend line + median with `Fixture` badge | D1, C6 |
| 5 | Type: `pin this: post reels at 7pm`, then `what have you pinned` | Second reply contains "post reels at 7pm" | C3, D2 |
| 6 | Type: `queue a report` | Confirm card "Shall I queue a report job?" → **Cancel** → "Cancelled — nothing queued." | C1, D2 |
| 7 | Repeat step 6 → **Confirm** | Job queued, `SIMULATED` badge | C1 |
| 8 | Type: `refresh my instagram data` → Confirm | "Collect queued — simulated in demo mode." | C2 (skip if cut) |
| 9 | Type: `delete all my data` | Refusal + offer to forget a specific item; no confirm card | D2 |
| 10 | Studio / Research tabs | Studio shows post count; Research "Competitor data: sample (connect Instagram for live)"; no env var names | D1 |

## Fallback

If the live app fails on the day: `docs/demo/screenshots/` (captured Fri 2 Oct after the passing rehearsal) + a 2-minute screen recording of steps 1–9.
