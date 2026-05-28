import { z } from "zod";

/** Fields allowed only on collect-stage payloads (C6). */
export const RAW_BLOB_FIELD_KEYS = [
  "payload",
  "payload_json",
  "payloadJson",
  "raw_blob",
  "rawBlob",
  "content",
  "contentHash",
] as const;

export type RawBlobFieldKey = (typeof RAW_BLOB_FIELD_KEYS)[number];

export function assertNoRawBlobFields(
  data: Record<string, unknown>,
  ctx: z.RefinementCtx,
): void {
  for (const key of RAW_BLOB_FIELD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Downstream job payloads must not include raw field "${key}" (C6); use immutable IDs only.`,
      });
    }
  }
}

export function withRawBlobGuard<T extends z.ZodTypeAny>(schema: T): z.ZodEffects<T> {
  return schema.superRefine((data, ctx) => {
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      assertNoRawBlobFields(data as Record<string, unknown>, ctx);
    }
  });
}
