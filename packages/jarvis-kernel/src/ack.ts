import type { JarvisTurnInput } from "@zeref/contracts";

const ACK_TEMPLATES: Array<{ pattern: RegExp; ack: string }> = [
  { pattern: /report|headline|elite/i, ack: "One moment, checking reports." },
  { pattern: /pipeline|worker|job|queue|status/i, ack: "Checking pipeline status now." },
  { pattern: /cockpit|dashboard|studio|panel/i, ack: "Pulling up the cockpit summary." },
  { pattern: /.*/, ack: "Understood, one moment please." },
];

export function buildAckText(transcript: string): string {
  const trimmed = transcript.trim();
  for (const { pattern, ack } of ACK_TEMPLATES) {
    if (pattern.test(trimmed)) {
      const words = ack.split(/\s+/);
      return words.slice(0, 12).join(" ");
    }
  }
  return "Understood, one moment please.";
}

export function validateTurnInput(input: JarvisTurnInput): JarvisTurnInput {
  if (!input.transcript.trim()) {
    throw new Error("transcript must be non-empty");
  }
  return input;
}
