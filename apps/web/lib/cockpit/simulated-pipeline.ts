import type { PipelineEvent } from "@zeref/contracts";

import { getCockpitEventBus } from "./cockpit-event-bus";

export function isWorkerAvailable(): boolean {
  return process.env.ZEREF_WORKER_AVAILABLE === "1";
}

/** Real outbox drain only when worker daemon is present (C117 honesty wiring). */
export function isOutboxDrainAllowed(): boolean {
  return isWorkerAvailable();
}

/** Honest simulated pipeline status when worker daemon is absent (ADR-027). */
export function buildSimulatedPipelineEvent(
  message = "Pipeline idle — worker daemon absent (simulated)",
): PipelineEvent {
  return {
    type: "pipeline",
    stage: "idle",
    message,
    ts: new Date().toISOString(),
    simulated: true,
  };
}

export function emitSimulatedPipelineIfWorkerAbsent(): void {
  if (isWorkerAvailable()) {
    return;
  }
  const event = buildSimulatedPipelineEvent();
  getCockpitEventBus().emit(event.type, event);
}
