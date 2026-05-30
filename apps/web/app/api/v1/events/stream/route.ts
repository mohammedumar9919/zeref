import {
  buildSimulatedTelemetryEvent,
  formatSseEvent,
  TELEMETRY_HEARTBEAT_INTERVAL_MS,
} from "@/lib/events";

export const dynamic = "force-dynamic";

/** GET /api/v1/events/stream — SSE stub with simulated telemetry (ADR-019). */
export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          formatSseEvent("telemetry", buildSimulatedTelemetryEvent()),
        ),
      );

      heartbeatTimer = setInterval(() => {
        controller.enqueue(encoder.encode(formatSseEvent("heartbeat")));
      }, TELEMETRY_HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      if (heartbeatTimer !== undefined) {
        clearInterval(heartbeatTimer);
      }
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
