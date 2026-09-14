import { getFacebookHealthResponse } from "@/lib/ops/facebook-health";

export const dynamic = "force-dynamic";

/** GET /api/v1/ops/facebook-health — FACEBOOK_* presence + soft BD probe (CLOUD-B3). */
export async function GET(): Promise<Response> {
  return Response.json(await getFacebookHealthResponse());
}
