# CLOUD-C17b — Motion system

- CSS-only motion (no new dependency). Tokens in `apps/web/app/globals.css` (`--motion-duration-fast|base|slow` = 120/200/320 ms, `--motion-ease-out|in|standard`, `--motion-slide-distance` 6px) exposed through `tailwind.config.ts` as `duration-fast|base|slow`, `ease-motion-out|in|standard`, and `animate-fade-in|fade-out|slide-up-in|scale-in`.
- Only `opacity`/`transform` are animated. Entry animations use `animation-fill-mode: backwards`, so no transform remains after the run. A resting transform would re-parent `position: fixed` descendants such as the fact cards. No `will-change` is set, so the browser promotes layers only while an animation runs.
- Reduced motion: global `@media (prefers-reduced-motion: reduce)` zeroes the tokens and forces every animation/transition to 0.01 ms, single iteration, no delay. `lib/motion/use-reduced-motion.ts` provides `useReducedMotion()` (`useSyncExternalStore`, server snapshot `false`) for JS-driven cases.
- Route transitions: `app/cockpit/template.tsx` (`data-testid="route-transition"`) remounts on every cockpit route (hub/studio/calendar/reports/research) with `animate-slide-up-in`. It has no exit animation, so navigation is never blocked.
- Panels: `CockpitPanel` and fact cards (C17a entry animation restored) use `scale-in`. `ConfirmCard` also uses `scale-in`. The typed composer shell and its error line use `fade-in`. TopNav links use `duration-base ease-motion-standard`.
- No data-testid changes and no API/lib/jarvis/package changes. C30 clean (verify-phase-5 import guard passed).

## Local results

- `npx tsc -b tsconfig.build.json`: clean. `npm run build -w @zeref/web`: OK.
- Web unit tests (`npm -w @zeref/web test`): 217 tests, 214 pass, 0 fail, 3 skipped. The new `test/c17b-reduced-motion.test.mjs` passes 6/6.
- Playwright `e2e/motion-c17b.spec.ts`: 4/4 pass.
- `node scripts/verify-phase-5.mjs`: OK. Full e2e run on 1 worker: 26 passed, 48 skipped by env gates, 0 failed.
- Not run locally (operator CPU limit; CI covers): env-gated specs such as `fact-cards-c17a` (`ZEREF_PHASE11_AGENT=1`) and `cockpit-composer-c1`. Both touch animated components and should be checked in CI.

## Risks

- First paint fades/slides the cockpit content in over 320 ms. This adds no layout shift (transform-only), but `hud-panel` backdrop blur can render slightly differently while an ancestor is below opacity 1 and settles when the animation ends.
- Playwright clicks wait for element stability during the brief transform, which adds ≤320 ms per fresh mount. Pointer events are never blocked.
