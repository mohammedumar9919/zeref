# Live AI voice setup (laptop)

Keep **cockpit data on fixtures** (`ZEREF_BFF_FIXTURE=1`) so badges stay honest. Only the **voice brain** goes live.

Do **not** unset BFF fixture or enable live Instagram for the college demo.

---

## 1. Create `apps/web/.env.local`

Next only loads server secrets from this file (already gitignored).

```env
# --- Required for live LLM ---
OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE
OPENROUTER_MODEL=openai/gpt-4o-mini

# --- TTS: pick ONE path ---
# Option A — ElevenLabs (preferred for demo voice)
ELEVENLABS_API_KEY=YOUR_ELEVENLABS_KEY
ELEVENLABS_VOICE_ID=YOUR_VOICE_ID

# Option B — OpenAI TTS fallback (if no ElevenLabs)
# OPENAI_API_KEY=sk-YOUR_OPENAI_KEY

# --- Do NOT set these for live cascade ---
# ZEREF_LLM_MOCK=1
# ZEREF_TTS_MOCK=1
# ZEREF_WHISPER_MOCK=1

# Optional: keep STT mocked until Whisper sidecar works
# ZEREF_WHISPER_MOCK=1
```

### Where to get keys

| Service | URL | Used for |
|---------|-----|----------|
| OpenRouter | https://openrouter.ai/keys | LLM / JARVIS tools |
| ElevenLabs | https://elevenlabs.io/app/settings/api-keys | Spoken voice |
| OpenAI | https://platform.openai.com/api-keys | TTS fallback only |

---

## 2. Start modes

### A. Full live voice (LLM + TTS; Whisper optional)

```powershell
cd C:\Projects\zeref
# Optional Whisper sidecar in another terminal:
#   cd apps\whisper
#   python -m whisper_sidecar.main

.\scripts\live-voice-start.ps1
```

If Whisper is not running yet, use mocked STT (fixed transcript) but live LLM + TTS:

```powershell
.\scripts\live-voice-start.ps1 -MockWhisper
```

### B. Live LLM only (beep TTS still mocked)

```powershell
.\scripts\live-voice-start.ps1 -MockWhisper -MockTts
```

### C. Coding with hot reload

```powershell
.\scripts\live-voice-start.ps1 -Dev -MockWhisper
```

### Fixture-only (no live keys) — instant prod feel

```powershell
.\scripts\demo-start.ps1
```

---

## 3. Verify health

With the server up:

1. Open http://localhost:3000/api/v1/voice/health  
   - Expect Whisper reachable **or** whisper mock true  
   - LLM mock must be **false** when OpenRouter is set  
2. Open http://localhost:3000/cockpit  
   - Data-age badges still say **Fixture**  
3. Hold **PTT**, speak, release  
   - Expect streaming reply (202 + SSE), not only sync-mock beep  
4. Press PTT again while speaking → barge-in stops audio  

---

## 4. Critical traps

| Mistake | Result |
|---------|--------|
| Leave `ZEREF_LLM_MOCK=1` + `ZEREF_TTS_MOCK=1` + `ZEREF_WHISPER_MOCK=1` | Forced **sync-mock** path — not live cascade |
| Put keys only in repo-root `.env` | Next may not see them — use **`apps/web/.env.local`** |
| Unset `ZEREF_TTS_MOCK` with no ElevenLabs/OpenAI key | TTS hard-fails mid-turn |
| Unset `ZEREF_BFF_FIXTURE` without Postgres seed | Empty cockpit / 404 studio |
| Judge speed under `next dev` only | Cold compile ~20–30s — use `demo-start.ps1` (prod) for UAT |

---

## 5. First-audio stopwatch

See [apps/web/lib/voice/FIRST_AUDIO_UAT.md](../apps/web/lib/voice/FIRST_AUDIO_UAT.md). Target &lt; 1.2s on a **warm** live turn. Do not claim the number until you measure it.
