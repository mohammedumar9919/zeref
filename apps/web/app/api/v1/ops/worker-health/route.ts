import { getWorkerHealthResponse } from "@/lib/ops/worker-health";

export const dynamic = "force-dynamic";

/** GET /api/v1/ops/worker-health — honest pg-boss consumer signal (Phase 10 — C113). */
export async function GET(): Promise<Response> {
  return Response.json(await getWorkerHealthResponse());
}
