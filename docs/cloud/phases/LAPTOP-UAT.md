# LAPTOP-UAT â€” College demo leftovers (human)

**Queue ID:** LAPTOP-UAT  
**Status:** LAPTOP_ONLY (see [../QUEUE.md](../QUEUE.md))  
**Depends on:** Track A DONE (A0â€“A5); optional live Track B already proven on this laptop

## Goal

Finish the **human** college artifacts that cloud workers cannot do: mic proof, Luke-style screenshot sign-off, and a short demo video. Product code stays frozen unless a blocker appears.

## Checklist (do in order)

### 1. Fixture demo cold start (required for video)

```powershell
cd C:\Projects\zeref
.\scripts\demo-start.ps1
```

Open http://localhost:3000/cockpit â€” badges must say **Fixture** / **SIMULATED**. Do **not** use `live-data-start.ps1` for the graded video.

Follow beats in [../../submission/DEMO_SCRIPT.md](../../submission/DEMO_SCRIPT.md) (2â€“3 min).

- [x] Cold start healthy (rebuild completed 2026-09-17)
- [x] Cockpit routes 200 on fixture demo (confirm Fixture chips visually)
### 2. Mic / first-audio UAT (optional if video uses fail-safe Research path)

See [../../../apps/web/lib/voice/FIRST_AUDIO_UAT.md](../../../apps/web/lib/voice/FIRST_AUDIO_UAT.md).

- [ ] PTT hold â†’ transcript â†’ ack â†’ result (mock TTS tone OK in fixture)
- [ ] Record measured first-audio ms only if you want to claim the 1.2s target

### 3. Luke screenshot sign-off

Capture cockpit workspace (four panels + globe + HUD) and save under:

`docs/design/reference/screenshots/`

Suggested name: `zeref-cockpit-laptop-uat.png` (or overwrite the 6.2 workspace ref if Planner agrees).

- [ ] Screenshot saved
- [ ] Matches cyan/void HUD (no purple AI look)

### 4. Demo video (2â€“3 min)

- [ ] Record screen + mic (or Research fail-safe without mic)
- [ ] Say the title line once from [../../submission/ABSTRACT.md](../../submission/ABSTRACT.md)
- [ ] Do **not** claim live Instagram publish
- [ ] Store file off-repo or in a private drive (do not commit large binaries unless asked)

### 5. Slides

Build PPT from [../../submission/SLIDES.md](../../submission/SLIDES.md) (8â€“12 slides), or open the ready HTML deck:

```powershell
start docs\submission\slides.html
```

Keys: â† â†’ / space Â· `F` fullscreen. Cyan/void Â· JetBrains Mono. Export to PPT later if judges require `.pptx`.

- [x] Deck drafted (`docs/submission/slides.html` from SLIDES.md)

## After this row

- College track is submission-ready.
- Product Track B next is still **TRACK-B-DEFER** (Next 16 / publish / auth / vector) â€” unlock only when Lead says so.
- Live ops already on laptop: IG + FB BD + bulk collect (`CLOUD-B5`) â€” keep separate from the fixture demo video.

## Planner note

Mark LAPTOP-UAT **DONE** in QUEUE only after screenshot + video exist (or explicit waiver). Cloud agents must not mark this DONE.
