import { getWebPhaseMarker } from "@/lib/bff";
import { PHASE10_CONTRACT_VERSION } from "@zeref/contracts";

export default function SettingsPage(): React.ReactElement {
  const marker = getWebPhaseMarker();

  return (
    <div
      data-testid="settings-page"
      className="mx-auto max-w-2xl px-4 py-8 md:px-6"
    >
      <h1 className="text-2xl font-semibold text-hud-primary">Settings</h1>
      <p className="mt-2 text-sm text-hud-muted">
        Phase 10 health and version panel. Voice and TTS toggles arrive in Phase
        11.
      </p>

      <section className="hud-panel mt-6 space-y-3 p-4">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/90">
          System
        </h2>
        <dl className="space-y-2 font-mono text-xs text-hud-muted">
          <div className="flex justify-between gap-4">
            <dt>Contract</dt>
            <dd className="text-hud-primary">{PHASE10_CONTRACT_VERSION}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Web marker</dt>
            <dd className="text-hud-primary">{marker}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Status</dt>
            <dd className="text-hud-cyan">ok</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
