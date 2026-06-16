export const DEFAULT_STALE_MS = 24 * 60 * 60 * 1000;

export type DataAgeState = "fixture" | "stale" | "live";

export function computeDataAge(
  collectedAtIso: string | undefined,
  nowMs: number,
  isFixture: boolean,
): {
  collectedAt?: string;
  dataAgeMs?: number;
  dataAgeState: DataAgeState;
} {
  if (isFixture) {
    return { dataAgeState: "fixture" };
  }

  if (!collectedAtIso) {
    return { dataAgeState: "stale" };
  }

  const collectedAtMs = Date.parse(collectedAtIso);
  if (!Number.isFinite(collectedAtMs)) {
    return { dataAgeState: "stale" };
  }

  const rawAge = nowMs - collectedAtMs;
  const dataAgeMs = rawAge < 0 ? 0 : rawAge;
  const dataAgeState: DataAgeState = dataAgeMs > DEFAULT_STALE_MS ? "stale" : "live";

  return {
    collectedAt: collectedAtIso,
    dataAgeMs,
    dataAgeState,
  };
}

export function aggregatePanelDataAgeState(
  items:
    | Array<{
        dataAgeState?: DataAgeState;
      }>
    | undefined,
): DataAgeState {
  if (!items || items.length === 0) {
    return "stale";
  }

  const states = items
    .map((item) => item.dataAgeState)
    .filter((state): state is DataAgeState => Boolean(state));

  if (states.length === 0) {
    return "stale";
  }

  if (states.every((state) => state === "fixture")) {
    return "fixture";
  }

  if (states.some((state) => state === "stale")) {
    return "stale";
  }

  return "live";
}

