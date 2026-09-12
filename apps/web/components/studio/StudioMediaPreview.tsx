import { resolveStudioMedia } from "./studio-media";

type StudioMediaPreviewProps = {
  payload: unknown;
  entityId?: string;
};

export function StudioMediaPreview({
  payload,
  entityId,
}: StudioMediaPreviewProps): React.ReactElement | null {
  const media = resolveStudioMedia(payload, entityId);
  if (!media.hasMedia) {
    return (
      <div
        data-testid="studio-media-preview"
        className="rounded border border-dashed border-hud-border bg-hud-surface/10 px-4 py-6 text-sm text-hud-muted"
      >
        No media URL on this snapshot.
      </div>
    );
  }

  const poster = media.thumbnailUrl ?? media.carouselUrls[0];

  return (
    <figure
      data-testid="studio-media-preview"
      className="overflow-hidden rounded border border-hud-border bg-hud-surface/20"
    >
      <div className="relative aspect-[4/5] max-h-[420px] w-full bg-void">
        {media.videoUrl ? (
          <video
            data-testid="studio-media-video"
            className="h-full w-full object-cover"
            controls
            playsInline
            poster={poster}
            src={media.videoUrl}
          />
        ) : poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            data-testid="studio-media-thumb"
            src={poster}
            alt={media.mediaType ? `${media.mediaType} preview` : "Studio media preview"}
            width={640}
            height={800}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-hud-muted">
        <span>{media.mediaType ?? "media"}</span>
        {media.carouselUrls.length > 1 ? (
          <span>{media.carouselUrls.length} frames</span>
        ) : null}
      </figcaption>
    </figure>
  );
}
