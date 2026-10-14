import { useSyncExternalStore } from "react";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type MediaQueryHost = {
  matchMedia?: (query: string) => MediaQueryList;
};

function defaultHost(): MediaQueryHost | undefined {
  return typeof window === "undefined" ? undefined : window;
}

export function getReducedMotionSnapshot(host: MediaQueryHost | undefined = defaultHost()): boolean {
  if (!host || typeof host.matchMedia !== "function") return false;
  return host.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Server render (and the first hydration pass) assumes full motion. */
export function getReducedMotionServerSnapshot(): boolean {
  return false;
}

export function subscribeReducedMotion(
  onChange: () => void,
  host: MediaQueryHost | undefined = defaultHost(),
): () => void {
  if (!host || typeof host.matchMedia !== "function") return () => {};
  const mql = host.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** True when the user asked the OS for reduced motion; tracks live changes. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}
