"use client";

import { useVoice } from "./VoiceProvider";

function MeterBar({ level, label }: { level: number; label: string }): React.ReactElement {
  const bars = 10;
  const active = Math.round(level * bars);

  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/70">
        {label}
      </span>
      <div className="flex h-6 items-end gap-0.5" aria-hidden>
        {Array.from({ length: bars }, (_, i) => (
          <span
            key={i}
            className="w-1 rounded-sm bg-hud-cyan/50 transition-all duration-75"
            style={{
              height: `${(i < active ? 4 + i * 2 : 3)}px`,
              opacity: i < active ? 1 : 0.35,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function AudioIoLive(): React.ReactElement {
  const { micLevel, outputLevel, voiceState } = useVoice();

  return (
    <div
      data-testid="audio-io-live"
      className="audio-io flex shrink-0 flex-col gap-2 rounded border border-hud-cyan/30 bg-panel/30 px-3 py-2 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/70">
          Audio I/O
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-hud-cyan">
          {voiceState}
        </span>
      </div>
      <div className="flex gap-4">
        <MeterBar level={micLevel} label="Mic in" />
        <MeterBar level={outputLevel} label="Out" />
      </div>
    </div>
  );
}
