import {
  StudioEntityDetailSchema,
  getStudioEntity,
  type StudioEntityDetail,
} from "./studio-bff";

/** Thrown when studio entity BFF returns 404 (RSC pages call notFound()). */
export class StudioEntityNotFoundError extends Error {
  constructor(entityId: string) {
    super(`studio entity not found: ${entityId}`);
    this.name = "StudioEntityNotFoundError";
  }
}

/** Thrown when studio entity BFF load or parse fails. */
export class StudioBffError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "StudioBffError";
    this.status = status;
  }
}

/**
 * RSC server load for studio entity editor (C77).
 * Calls getStudioEntity() directly — no HTTP loopback.
 */
export async function getStudioEntityDetail(
  entityId: string,
): Promise<StudioEntityDetail> {
  const result = await getStudioEntity(entityId);

  if (result.status === 404) {
    throw new StudioEntityNotFoundError(entityId);
  }

  if (result.status !== 200) {
    const message =
      "error" in result.body && typeof result.body.error === "string"
        ? result.body.error
        : "failed to load studio entity";
    throw new StudioBffError(message, result.status);
  }

  try {
    return StudioEntityDetailSchema.parse(result.body);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "invalid studio entity response";
    throw new StudioBffError(message);
  }
}
