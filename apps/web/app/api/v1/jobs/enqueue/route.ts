import { NextResponse } from "next/server";

import { JobEnqueueRequestSchema, JobEnqueueRequestSchemaV9 } from "@zeref/contracts";

import { isPhase9ResearchActive } from "@/lib/cockpit-bff";
import { enqueueJob } from "@/lib/jobs/enqueue-job";

export const dynamic = "force-dynamic";

/** POST /api/v1/jobs/enqueue — allowlisted pg-boss enqueue (ADR-030). */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const schema = isPhase9ResearchActive()
    ? JobEnqueueRequestSchemaV9
    : JobEnqueueRequestSchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid job enqueue request" }, { status: 400 });
  }

  try {
    const result = await enqueueJob(parsed.data);
    const status = result.workerConsuming ? 200 : 202;

    return NextResponse.json(
      {
        jobId: result.jobId,
        queued: result.queued,
        workerConsuming: result.workerConsuming,
        ...(result.mocked ? { mocked: true } : {}),
      },
      { status },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "job enqueue failed";
    if (message.includes("required for")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[jobs/enqueue] failed:", error);
    return NextResponse.json({ error: "job enqueue failed" }, { status: 500 });
  }
}
