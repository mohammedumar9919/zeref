"use client";

import { useVoice } from "./VoiceProvider";

const ROLE_LABEL: Record<string, string> = {
  user: "You",
  ack: "Ack",
  assistant: "Jarvis",
};

export function TranscriptPanel(): React.ReactElement | null {
  const { transcripts } = useVoice();

  if (transcripts.length === 0) return null;

  return (
    <section
      data-testid="voice-transcript-panel"
      className="mx-auto max-w-[1600px] px-4 pb-2 md:px-6"
      aria-label="Voice transcript"
    >
      <ul className="glass-column max-h-28 space-y-1 overflow-y-auto p-3 font-mono text-[10px] text-hud-muted">
        {transcripts.map((line) => (
          <li key={line.id}>
            <span className="text-hud-cyan/80">
              {ROLE_LABEL[line.role] ?? line.role}:
            </span>{" "}
            {line.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
