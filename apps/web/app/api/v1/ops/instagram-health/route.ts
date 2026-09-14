import { getInstagramHealthResponse } from "@/lib/ops/instagram-health";

export const dynamic = "force-dynamic";

/** GET /api/v1/ops/instagram-health — token presence + Graph /me probe (CLOUD-B1). */
export async function GET(): Promise<Response> {
  return Response.json(await getInstagramHealthResponse());
}
