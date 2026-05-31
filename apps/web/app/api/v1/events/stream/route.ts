import {
  buildSimulatedTelemetryEvent,
  formatSseEvent,
  TELEMETRY_HEARTBEAT_INTERVAL_MS,
} from "@/lib/events";
import { getVoiceEventBus } from "@/lib/voice/voice-event-bus";

export const dynamic = "force-dynamic";

/** GET /api/v1/events/stream — telemetry stub + live voice events (ADR-019 / ADR-024). */
export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let unsubscribeVoice: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          formatSseEvent("telemetry", buildSimulatedTelemetryEvent()),
        ),
      );

      unsubscribeVoice = getVoiceEventBus().subscribe((eventType, data) => {
        controller.enqueue(encoder.encode(formatSseEvent(eventType, data)));
      });

      heartbeatTimer = setInterval(() => {
        controller.enqueue(encoder.encode(formatSseEvent("heartbeat")));
      }, TELEMETRY_HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      if (heartbeatTimer !== undefined) {
        clearInterval(heartbeatTimer);
      }
      unsubscribeVoice?.();
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
