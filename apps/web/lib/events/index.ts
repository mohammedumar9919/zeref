import {
  TelemetryEventSchema,
  type TelemetryEvent,
} from "@zeref/contracts";

/** Default stub message for Phase 5.1 SSE (ADR-019). */
export const SIMULATED_TELEMETRY_MESSAGE =
  "Pipeline idle — stub telemetry (Phase 5.1)";

/** Build a schema-valid simulated telemetry event for the SSE stub. */
export function buildSimulatedTelemetryEvent(
  message: string = SIMULATED_TELEMETRY_MESSAGE,
): TelemetryEvent {
  return {
    simulated: true,
    message,
    ts: new Date().toISOString(),
  };
}

/** Parse and validate a telemetry event payload from SSE JSON. */
export function parseTelemetryEvent(data: unknown): TelemetryEvent {
  return TelemetryEventSchema.parse(data);
}

/** Format a Server-Sent Events frame (event + optional JSON data). */
export function formatSseEvent(event: string, data?: unknown): string {
  if (data === undefined) {
    return `event: ${event}\n\n`;
  }
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export const TELEMETRY_HEARTBEAT_INTERVAL_MS = 15_000;
