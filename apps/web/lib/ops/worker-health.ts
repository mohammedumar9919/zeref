import { WorkerHealthResponseSchema, type WorkerHealthResponse } from "@zeref/contracts";

import { isWorkerAvailable } from "../cockpit/simulated-pipeline";
import { isFixtureMode } from "../db";

/** Resolve honest worker consumption signal without sync DB (C113, C124). */
export function resolveWorkerHealth(): WorkerHealthResponse {
  if (isFixtureMode()) {
    return { consuming: false, source: "fixture" };
  }

  if (isWorkerAvailable()) {
    return { consuming: true, source: "pg-boss" };
  }

  return { consuming: false, source: "env" };
}

export function getWorkerHealthResponse(): WorkerHealthResponse {
  return WorkerHealthResponseSchema.parse(resolveWorkerHealth());
}
