import { z } from "zod";

import { runJarvisAgent } from "@/lib/jarvis/agent-runtime";

export const dynamic = "force-dynamic";

const JarvisRunRequestSchema = z
  .object({
    turnId: z.string().uuid(),
    transcript: z.string().min(1),
    confirmed: z.boolean().optional(),
    runId: z.string().uuid().optional(),
  })
  .strict();

/** POST /api/v1/jarvis/run — agentic JARVIS slow path (C157). */
export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    const parsed = JarvisRunRequestSchema.parse(body);
    const result = await runJarvisAgent(parsed);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "jarvis run failed";
    const status = error instanceof z.ZodError ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
