import {
  buildSimulatedTelemetryEvent,
  formatSseEvent,
  TELEMETRY_HEARTBEAT_INTERVAL_MS,
} from "@/lib/events";
import { getCockpitEventBus } from "@/lib/cockpit/cockpit-event-bus";
import {
  COCKPIT_OUTBOX_POLL_MS,
  drainCockpitOutboxOnce,
} from "@/lib/cockpit/outbox-drain";
import { emitSimulatedPipelineIfWorkerAbsent } from "@/lib/cockpit/simulated-pipeline";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/v1/events/stream — telemetry + unified cockpit SSE (ADR-019 / ADR-024 / ADR-027). */
export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let outboxTimer: ReturnType<typeof setInterval> | undefined;
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

      if (getDb()) {
        void drainCockpitOutboxOnce();
        outboxTimer = setInterval(() => {
          void drainCockpitOutboxOnce();
        }, COCKPIT_OUTBOX_POLL_MS);
      }

      heartbeatTimer = setInterval(() => {
        controller.enqueue(encoder.encode(formatSseEvent("heartbeat")));
      }, TELEMETRY_HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      if (heartbeatTimer !== undefined) {
        clearInterval(heartbeatTimer);
      }
      if (outboxTimer !== undefined) {
        clearInterval(outboxTimer);
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
