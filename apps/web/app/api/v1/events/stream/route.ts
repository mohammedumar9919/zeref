import {
  buildSimulatedTelemetryEvent,
  formatSseEvent,
  TELEMETRY_HEARTBEAT_INTERVAL_MS,
} from "@/lib/events";
import { getCockpitEventBus } from "@/lib/cockpit/cockpit-event-bus";
import { ensureCockpitOutboxPollerRunning } from "@/lib/cockpit/outbox-poller";
import { emitSimulatedPipelineIfWorkerAbsent } from "@/lib/cockpit/simulated-pipeline";

export const dynamic = "force-dynamic";

/** GET /api/v1/events/stream — telemetry + unified cockpit SSE (ADR-019 / ADR-024 / ADR-027). */
export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let unsubscribeCockpit: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          formatSseEvent("telemetry", buildSimulatedTelemetryEvent()),
        ),
      );

      unsubscribeCockpit = getCockpitEventBus().subscribe((eventType, data) => {
        controller.enqueue(encoder.encode(formatSseEvent(eventType, data)));
      });

      emitSimulatedPipelineIfWorkerAbsent();
      ensureCockpitOutboxPollerRunning();

      heartbeatTimer = setInterval(() => {
        controller.enqueue(encoder.encode(formatSseEvent("heartbeat")));
      }, TELEMETRY_HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      if (heartbeatTimer !== undefined) {
        clearInterval(heartbeatTimer);
      }
      unsubscribeCockpit?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
