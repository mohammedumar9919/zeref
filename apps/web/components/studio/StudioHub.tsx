import Link from "next/link";

import type { CockpitStudioItemV8 } from "@zeref/contracts";

type StudioHubProps = {
  items: CockpitStudioItemV8[];
  insufficientData: boolean;
};

export function StudioHub({
  items,
  insufficientData,
}: StudioHubProps): React.ReactElement {
  return (
    <section
      data-testid="studio-hub"
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 border-t border-hud-border px-4 py-8 md:px-6"
    >
      <header className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/90">
          Studio hub
        </p>
        <h2 className="text-lg font-medium text-hud-primary">Content drafts</h2>
        <p className="text-sm text-hud-muted">
          Edit captions and schedule posts from normalized entity snapshots (Phase
          8)
        </p>
      </header>

      {items.length === 0 ? (
        <p
          data-testid="studio-hub-empty"
          className="rounded border border-hud-border bg-hud-surface/30 px-4 py-6 text-sm text-hud-muted"
        >
          {insufficientData
            ? "Insufficient normalized entity data."
            : "No studio snapshots yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="studio-hub-item-list">
          {items.map((item) => (
            <li key={item.entityId}>
              <Link
                href={`/cockpit/studio/${item.entityId}`}
                data-testid={`studio-hub-item-${item.entityId}`}
                className="block rounded border border-hud-border bg-hud-surface/20 px-4 py-3 transition-colors hover:border-hud-cyan/40 hover:bg-hud-cyan/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-sm font-medium text-hud-primary">
                    {item.title}
                  </span>
                  {item.status ? (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
                      {item.status}
                    </span>
                  ) : null}
                </div>
                {item.hasDraft && item.draftPreview ? (
                  <p className="mt-1 font-mono text-[10px] text-amber-200/90">
                    draft · {item.draftPreview}
                  </p>
                ) : item.hasDraft ? (
                  <p className="mt-1 font-mono text-[10px] text-amber-200/90">
                    draft saved
                  </p>
                ) : null}
                <p className="mt-1 font-mono text-[10px] text-hud-muted">
                  {item.snapshotId
                    ? `snapshot ${item.snapshotId.slice(0, 8)}…`
                    : "no snapshot"}
                  {item.updatedAt
                    ? ` · updated ${new Date(item.updatedAt).toLocaleString()}`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
