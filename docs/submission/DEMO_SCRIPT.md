# 4-beat demo script

**Runtime:** 2–3 minutes (laptop records video — not this cloud slice)  
**Mode:** fixture / mock. Do **not** switch to live Graph mid-talk.  
**Title line (say once):** “Zeref — an autonomous JARVIS command center for Instagram growth.”

Start from repo root on Windows (no Docker, no live keys):

```powershell
.\scripts\demo-start.ps1
```

Then open:

| Beat | URL |
|------|-----|
| 1 | http://localhost:3000/cockpit |
| 2 | stay on `/cockpit` (voice) **or** fail-safe `/cockpit/research` |
| 3 | `/cockpit/studio/550e8400-e29b-41d4-a716-446655440001` → `/cockpit/calendar` → `/cockpit/reports?artifact=550e8400-e29b-41d4-a716-446655440000` |
| 4 | `/cockpit/research` then back to `/cockpit` |

Fixture ids (say “demo fixture,” never “live account”):

| Thing | Id / value |
|-------|------------|
| Studio entity | `550e8400-e29b-41d4-a716-446655440001` (LOG240 ride log) |
| Report artifact | `550e8400-e29b-41d4-a716-446655440000` |
| Research topic | `770e8400-e29b-41d4-a716-446655440001` |
| Outlier shortcode | `HIT999` — 5.5× own-account median (600 vs 110) |
| Calendar slot | “Night ride recap” |

---

## Beat 1 — Command center (0:00–0:35)

**Do:** Land on `/cockpit`. Pause on the cyan globe, four glass panels (Studio, Calendar, Reports, Research), HUD chips, footer objective.

**Say:**

> This is Zeref. One JARVIS command center for Instagram growth ops — not five disconnected tools. The globe is the brain. The four panels are the work: draft, schedule, report, research. Badges that say Fixture or SIMULATED are honest. This run is fixture mode so the demo cannot lie.

**Show:** `data-age` **Fixture** chips if visible; **SIMULATED** on telemetry / AUDIO if the stream is stubbed.

**Fail-safe:** If the globe is slow or WebGL is off, ignore the orb and point at the four panels. The grid is the product.

---

## Beat 2 — JARVIS (0:35–1:15)

**Preferred (mic works):** Hold **PTT** (“Hold to talk”). Say one line, release.

> Jarvis — what’s the weekly brief?

or

> Show me the outliers.

**Expect:** transcript line, `agent.step` chip on the HUD, spoken reply that the weekly brief / own-account outliers are ready. Mock TTS may be a tone, not British speech — that is still a real turn.

**Do not say:** “This is live Instagram.” Do not claim first-audio under 1.2s unless the laptop UAT already measured it.

### Fail-safe A — typed fallback (no mic / PTT denied)

There is **no typed JARVIS composer** in the HUD. Do not invent one on stage.

1. Say: “Voice is optional. Same intel is on the research hub — I’ll type the operator path.”
2. Open `/cockpit/research`.
3. Point at **HIT999**, **5.5×**, and the weekly brief text. The brief is labeled mocked; competitor `@ride_lab_pro` is fixture-only.
4. Optional laptop proof (off-projector): `POST /api/v1/jarvis/run` with a typed `transcript` — same agent path the PTT turn uses. Not a polished chat UI.

**Typed prompt that matches the mock router** (if you use the API or a future HUD box):

- `what's the weekly brief`
- `show outliers`

### Fail-safe B — fixture mode already on

If anything 404s, you left fixture mode. Restart `.\scripts\demo-start.ps1`. Do not open Postgres or live tokens during the talk.

---

## Beat 3 — Operator surfaces (1:15–2:05)

Click. Do not wait for voice.

1. **Studio** — `/cockpit/studio/550e8400-e29b-41d4-a716-446655440001`  
   **Say:** “Studio is a draft room over a snapshot — media preview and hook assist. This is LOG240, a fixture ride log, not a live scrape.”
2. **Calendar** — `/cockpit/calendar`  
   **Say:** “Content slot first: caption, media, time. ‘Night ride recap.’ Job enqueue stays advanced. JARVIS will ask before it writes a slot.”
3. **Reports** — `/cockpit/reports?artifact=550e8400-e29b-41d4-a716-446655440000`  
   **Say:** “Reports are narrative plus a few HUD charts. Raw JSON is advanced, not the front door.”

**Fail-safe:** Skip any one surface that errors. Two of three is enough. Do not paste raw elite JSON as if it were the UI.

---

## Beat 4 — Intel + honesty close (2:05–2:40)

**Do:** `/cockpit/research` if you skipped it in Beat 2. Point at HIT999 and the weekly brief. Return to `/cockpit`.

**Say:**

> Research intel: own-account posts at or above five times the median. HIT999 is a fixture outlier — six hundred versus a median of one-ten, hook score eight out of ten, mocked. The brief is grounded in that post, not a hallucinated trend list.
>
> Zeref will collect, analyze, and propose. It will not publish to Instagram. Publish is Track B — Meta App Review — not this build. Human approval stays on the write path.
>
> Zeref: an autonomous JARVIS command center for Instagram growth.

**Stop.** Do not open Settings, Docker, or a live Graph UAT.

---

## Global fail-safes (print and keep off-camera)

| Failure | What you do | What you say |
|---------|-------------|--------------|
| Mic / PTT / browser permission | Beat 2 fail-safe A — click Research | “Typed path. Same brief.” |
| No audio from mock TTS | Point at transcript + `agent.step` | “The turn ran. Audio is mocked in fixture mode.” |
| Studio 404 | Confirm `demo-start.ps1` / `ZEREF_BFF_FIXTURE=1` | “Fixture entity only — restarting demo mode.” |
| Globe / WebGL | Four-panel grid | “The command surface is the panels.” |
| Urge to show live IG | Do not | “Collect exists. Publish does not. We will not fake it.” |
| Random metric on a slide | Use only HIT999 5.5× / fixture brief | “These numbers are fixture-labeled.” |

## Laptop leftover (not this PR)

- Record 2–3 min video from this script
- Mic / first-audio UAT (`apps/web/lib/voice/FIRST_AUDIO_UAT.md`)
- Luke screenshot sign-off vs `docs/design/reference/lukebuildsai-jarvis-hud.jpeg`
