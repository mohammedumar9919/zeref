import {
  MergedInstagramPostPayloadSchema,
  NormalizedPostPayloadSchema,
  type NormalizedPostPayload,
} from "@zeref/contracts";
import { fieldsFromMerged } from "@zeref/analytics";

/** Parse merged snapshot JSON without importing @zeref/instagram (C14). */
export function parseMergedSnapshotPayload(payloadJson: unknown) {
  return MergedInstagramPostPayloadSchema.parse(payloadJson);
}

export function buildNormalizedPostPayload(
  merged: ReturnType<typeof parseMergedSnapshotPayload>,
  schemaVersion: string,
  platformAccountId?: string,
): NormalizedPostPayload {
  const fields = fieldsFromMerged(merged);
  return NormalizedPostPayloadSchema.parse({
    shortcode: fields.shortcode,
    ...(platformAccountId ? { platformAccountId } : {}),
    sources: fields.sources,
    caption: fields.caption,
    likes: fields.likes,
    comments: fields.comments,
    mediaType: fields.mediaType,
    schemaVersion,
  });
}
