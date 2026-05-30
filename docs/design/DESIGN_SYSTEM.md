# Zeref Design System — Phase 5

**Theme:** Dark command-center operator cockpit  
**Scope:** `apps/web` Phase 5 shell (panels + globe). Phase 8+ extends Studio/Calendar UX.

---

## Principles

1. **Minimal nav** — Top-level routes only: Cockpit | Settings (C25).
2. **HUD aesthetic** — Cyan accent on void background; monospace labels; panel chrome with subtle scanlines.
3. **RSC-first data** — Panel summaries render from server-fetched BFF slices; client state limited to the globe island (C27).
4. **Honest empty states** — Use `insufficientData` from contracts; no fabricated metrics.

---

## Color tokens

| Token | CSS variable | Usage |
|-------|--------------|-------|
| Void | `--bg-void` `#050810` | Page background |
| Panel | `--bg-panel` | Frosted panel fill |
| Primary text | `--text-primary` `#f0f9ff` | Headlines, values |
| Muted text | `--text-muted` `#94a3b8` | Secondary copy |
| Accent cyan | `--accent-cyan` `#22d3ee` | Links, labels, globe emissive |
| HUD border | `--border-hud` | Panel borders |

---

## Typography

- **Sans:** Inter (`--font-sans`) — body copy
- **Mono:** JetBrains Mono (`--font-mono`) — panel titles, nav, metadata

Panel titles: `font-mono text-[10px] uppercase tracking-widest text-hud-cyan/90`

---

## Components

### `.hud-panel`

Primary surface for cockpit panels and settings cards. Includes gradient fill, inner shadow, and scanline overlay.

### Cockpit grid (C26)

Desktop (`lg+`):

```
┌─────────────┬──────────────┬─────────────┐
│ Studio      │              │ Reports     │
│ Calendar    │ Globe island │ Research    │
└─────────────┴──────────────┴─────────────┘
```

Mobile: single column — globe first, then left stack, then right stack (ADR-017).

### Globe island

Client-only Three.js/R3F chunk. Wireframe icosahedron with idle rotation. No voice reactivity in Phase 5 (C30).

---

## Test IDs (Playwright / QA)

| `data-testid` | Region |
|---------------|--------|
| `top-nav` | Top navigation bar |
| `nav-cockpit` | Cockpit nav link |
| `nav-settings` | Settings nav link |
| `cockpit-grid` | Full cockpit layout |
| `panel-studio` | Studio panel |
| `panel-calendar` | Calendar panel |
| `panel-reports` | Reports panel |
| `panel-research` | Research panel |
| `globe-island` | Globe container |
| `globe-canvas` | WebGL canvas (after lazy load) |

---

## Related

- [Phase 5 contract](../governance/phase-5-contract.md)
- [ADR-015](../governance/adr/ADR-015-globe-performance.md)
- [ADR-017](../governance/adr/ADR-017-cockpit-routes-layout.md)
