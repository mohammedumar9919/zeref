# C17b — Motion system

H2b ([vision intake](../../superpowers/plans/2026-09-30-vision-intake.md) idea 5 "smooth transitions"). Depends on C17a (fact cards, merged).

**Goal:** route and panel transitions that feel smooth, respect reduced motion, and cause no layout jank.

## Today

- Next 15 + Tailwind 3 (`apps/web/tailwind.config.ts`, `app/globals.css`). No motion library, no route `template.tsx`, no keyframes (C17a fact cards had to drop their animation).

## Deliverables

1. **Tokens:** durations (`fast` 120 ms, `base` 200 ms, `slow` 320 ms) and easings as CSS variables in `globals.css` + Tailwind `theme.extend` (`transitionDuration`, `transitionTimingFunction`, `keyframes`, `animation`: `fade-in`, `fade-out`, `slide-up-in`, `scale-in`).
2. **Reduced motion:** a global `@media (prefers-reduced-motion: reduce)` rule that sets durations to ~0 and disables keyframe animations; a tiny `useReducedMotion()` hook (client) for JS-driven cases.
3. **Route transitions:** `app/(…)/template.tsx` (or the shell route group that wraps cockpit/studio/reports/research/calendar) with a fade + small slide-up on mount — CSS only, opacity/transform only (no layout properties), no exit animation that blocks navigation.
4. **Panels:** cockpit panels and HUD overlays (fact cards, confirm card, typed composer) use the tokens: `scale-in`/`fade-in` on mount. Re-add the C17a fact-card entry animation.
5. **No jank:** animate only `opacity` and `transform`; no animation on initial SSR paint that shifts layout (CLS); `will-change` only during animation.
6. **Tests:** unit test for the reduced-motion hook; Playwright spec `e2e/motion-c17b.spec.ts` that emulates `reducedMotion: "reduce"` and asserts computed `animation-duration`/`transition-duration` ≈ 0 on a panel, and that navigation between two routes still works. Existing e2e specs must stay green (they click immediately — animations must not block pointer events).

## Rules

- No purple gradients. No new runtime dependency unless clearly justified in the PR (prefer CSS).
- C30: client components never import `@zeref/jarvis-kernel`, `@zeref/instagram`, whisper or `@zeref/zeref-memory`.
- No changes to API routes, lib/jarvis, contracts, db, kernel.
