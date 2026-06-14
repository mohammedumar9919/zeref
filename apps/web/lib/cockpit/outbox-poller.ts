import { getDb } from "../db";

import { COCKPIT_OUTBOX_POLL_MS, drainCockpitOutboxOnce } from "./outbox-drain";
import { isOutboxDrainAllowed } from "./simulated-pipeline";

const POLLER_KEY = Symbol.for("zeref.cockpitOutboxPoller");

type OutboxPollerState = {
  timer: ReturnType<typeof setInterval> | null;
};

function getPollerState(): OutboxPollerState {
  const globalRef = globalThis as typeof globalThis & {
    [POLLER_KEY]?: OutboxPollerState;
  };
  globalRef[POLLER_KEY] ??= { timer: null };
  return globalRef[POLLER_KEY];
}

/** Start the process-level outbox poller when drain is allowed (ADR-037 / C130). */
export function ensureCockpitOutboxPollerRunning(): void {
  if (!getDb() || !isOutboxDrainAllowed()) {
    return;
  }

  const state = getPollerState();
  if (state.timer !== null) {
    return;
  }

  void drainCockpitOutboxOnce();
  state.timer = setInterval(() => {
    void drainCockpitOutboxOnce();
  }, COCKPIT_OUTBOX_POLL_MS);
}

/** Test isolation — stops the singleton poller between cases. */
export function stopCockpitOutboxPollerForTests(): void {
  const state = getPollerState();
  if (state.timer !== null) {
    clearInterval(state.timer);
    state.timer = null;
  }
}
