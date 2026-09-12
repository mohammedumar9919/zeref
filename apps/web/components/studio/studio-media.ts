/** Fixture studio entity used by ZEREF_BFF_FIXTURE + CURRENT_STATE demo. */
export const FIXTURE_STUDIO_ENTITY_ID = "550e8400-e29b-41d4-a716-446655440001";

/** HUD-tinted placeholder so fixture UAT shows media without Instagram CDN. */
export const FIXTURE_STUDIO_THUMBNAIL_URL =
  "https://placehold.co/640x800/050810/22d3ee/png?text=LOG240";

export type StudioMediaPreview = {
  thumbnailUrl?: string;
  videoUrl?: string;
  carouselUrls: string[];
  mediaType?: string;
  hasMedia: boolean;
};

function asUrl(value: unknown): string | undefined {
  return typeof value === "string" && /^https?:\/\//i.test(value) ? value : undefined;
}

function asUrlList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asUrl).filter((item): item is string => Boolean(item));
}

/** Resolve thumbnail / video / carousel from a normalized payload, with fixture fallback. */
export function resolveStudioMedia(payload: unknown, entityId?: string): StudioMediaPreview {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const thumbnailUrl = asUrl(record.thumbnailUrl);
  const videoUrl = asUrl(record.videoUrl);
  const carouselUrls = asUrlList(record.carouselUrls);
  const mediaType = typeof record.mediaType === "string" ? record.mediaType : undefined;

  if (thumbnailUrl || videoUrl || carouselUrls.length > 0) {
    return {
      thumbnailUrl,
      videoUrl,
      carouselUrls,
      mediaType,
      hasMedia: true,
    };
  }

  if (entityId === FIXTURE_STUDIO_ENTITY_ID) {
    return {
      thumbnailUrl: FIXTURE_STUDIO_THUMBNAIL_URL,
      videoUrl: undefined,
      carouselUrls: [],
      mediaType: "IMAGE",
      hasMedia: true,
    };
  }

  return {
    thumbnailUrl: undefined,
    videoUrl: undefined,
    carouselUrls: [],
    mediaType,
    hasMedia: false,
  };
}
