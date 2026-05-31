# Zeref Design System — Phase 5 / 5.1

**Theme:** Dark command-center operator cockpit (Luke JARVIS HUD fusion)  
**Scope:** `apps/web` cockpit shell. Phase 8+ extends Studio/Calendar UX.

**Visual reference:** [lukebuildsai-jarvis-hud.jpeg](./reference/lukebuildsai-jarvis-hud.jpeg)

---

## Principles

1. **Minimal nav** — Top-level routes only: Cockpit | Settings (C25).
2. **Luke HUD chrome** — Cyan mono on void; status chips in header; objective + telemetry in footer (C43).
3. **RSC-first data** — Panel summaries from server BFF; client islands limited to globe + telemetry (C27).
4. **Honest simulated state** — SSE stub and AUDIO I/O show visible **SIMULATED** badges (C47).
5. **No purple AI gradients** — cyan/teal command-center only (ui-ux-pro-max).

---

## Color tokens

| Token | CSS variable | Usage |
|-------|--------------|-------|
| Void | `--bg-void` `#050810` | Page background |
| Panel | `--bg-panel` | Frosted panel fill |
| Primary text | `--text-primary` `#f0f9ff` | Headlines, values |
| Muted text | `--text-muted` `#94a3b8` | Secondary copy |
| Accent cyan | `--accent-cyan` `#22d3ee` | Links, labels, globe points |
| HUD border | `--border-hud` | Panel borders |
| Simulated amber | Tailwind `amber-200/400` | SIMULATED badges |

---

## Typography

- **Sans:** Inter (`--font-sans`) — body copy
- **Mono:** JetBrains Mono (`--font-mono`) — HUD labels, nav, telemetry

HUD labels: `font-mono text-[10px] uppercase tracking-widest`

---

## Luke HUD layout (Phase 5.1)

```
┌─────────────────────────────────────────────────────────────┐
│  hud-header — status chips, system title                    │
├──────────────┬──────────────────────────┬───────────────────┤
│ glass-column │   globe-hero (≥45vh)       │ glass-column      │
│ Studio       │   point-cloud + rings      │ Reports           │
│ Calendar     │   (no .hud-panel)          │ Research          │
├──────────────┴──────────────────────────┴───────────────────┤
│  hud-footer — objective · TelemetryStrip · AUDIO I/O stub   │
└─────────────────────────────────────────────────────────────┘
```

### `.glass-column`

Frosted side stacks wrapping product panels. Inner panels keep `.hud-panel` + `panel-*` test IDs.

### `.globe-hero`

Full-bleed WebGL hero — **not** wrapped in `.hud-panel`. Minimum **45vh** on desktop (C44).

### Globe (ADR-015 amendment)

- **Point cloud:** fibonacci sphere, ≤12k points (8192 in implementation)
- **Rings:** 3 torus meshes, ≤8k tris combined
- **Mode marker:** `data-globe-mode="point-cloud"` on island + canvas
- Client-only lazy chunk; idle rotation only (C30)

---

## Components

| Component | Role |
|-----------|------|
| `HudShell` | Wraps cockpit with `hud-header` + `hud-footer` |
| `TelemetryStrip` | `EventSource` → `/api/v1/events/stream` |
| `AudioIoPlaceholder` | Footer waveform stub, SIMULATED label |

---

## Test IDs (Playwright / QA)

| `data-testid` | Region |
|---------------|--------|
| `top-nav` | Top navigation bar |
| `nav-cockpit` | Cockpit nav link |
| `nav-settings` | Settings nav link |
| `hud-header` | Luke HUD header chrome (C48) |
| `hud-footer` | Luke HUD footer chrome (C48) |
| `telemetry-simulated` | SIMULATED telemetry badge (C48) |
| `audio-io-simulated` | AUDIO I/O placeholder (C48) |
| `cockpit-grid` | Full cockpit layout |
| `panel-studio` | Studio panel |
| `panel-calendar` | Calendar panel |
| `panel-reports` | Reports panel |
| `panel-research` | Research panel |
| `globe-island` | Full-bleed hero wrapper (no `.hud-panel`) |
| `globe-canvas` | WebGL canvas (`data-globe-mode=point-cloud`) |

---

## Related

- [Phase 5 contract](../governance/phase-5-contract.md)
- [Phase 5.1 contract](../governance/phase-5.1-contract.md)
- [Phase 6 contract](../governance/phase-6-contract.md)
- [ADR-015 amendment](../governance/adr/ADR-015-amendment-phase-5.1.md)
- [ADR-017](../governance/adr/ADR-017-cockpit-routes-layout.md)
- [ADR-019](../governance/adr/ADR-019-telemetry-sse-stub.md)
- [ADR-023](../governance/adr/ADR-023-globe-voice-states.md)
- [ADR-024](../governance/adr/ADR-024-live-sse-voice-events.md)

---

## Phase 6 voice UX (C55–C58)

### PTT (C55)

- **`data-testid="ptt-button"`** — hold-to-talk; `aria-label="Hold to talk to Jarvis"`.
- Pointer capture for reliable release; posts `multipart/form-data` audio to `POST /api/v1/voice/turn`.
- **CI mock:** 200 sync JSON → client plays ack then result from response body.
- **Live/dev:** 202 `{ turnId, transcript }` → ack/result via SSE `voice.audio` (Amendment A).

### AUDIO I/O (C58)

- **`data-testid="audio-io-live"`** replaces `audio-io-simulated` on cockpit routes.
- Mic meter during PTT hold; output meter during TTS playback (Web Audio analyser).
- No browser OpenRouter / whisper / jarvis-kernel imports.

### Globe voice states (C57 / ADR-023)

| State | Globe behavior |
|-------|----------------|
| `idle` | Phase 5.1 defaults |
| `listening` | Brighter points; ring pulse (PTT held) |
| `thinking` | Faster rotation; opacity/scale pulse — **no bloom** |
| `speaking` | Point scale from output analyser level |

Attribute: `data-globe-voice-state` on `globe-island` and `globe-canvas`.

### Telemetry honesty (C60)

- **`telemetry-simulated`** badge hidden after live `voice.*` or non-simulated `pipeline` SSE events.
- Transcript panel (optional): user → ack → assistant lines in footer stack.

### Test IDs (Phase 6)

| `data-testid` | Region |
|---------------|--------|
| `ptt-button` | Hold-to-talk control |
| `audio-io-live` | Live mic/output meters |
| `voice-transcript-panel` | Two-phase transcript strip |
