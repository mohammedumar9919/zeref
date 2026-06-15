/** Persona mode — separate from tool routing (C145). */
export type PersonaMode = "study" | "ops" | "casual";

const STUDY_PATTERN =
  /\b(study|exam|revise|revision|learn|lecture|coursework|essay)\b/i;
const OPS_PATTERN =
  /\b(cockpit|pipeline|report|worker|calendar|enqueue|studio|research|ops|status)\b/i;

export function detectPersonaMode(transcript: string): PersonaMode {
  if (STUDY_PATTERN.test(transcript)) return "study";
  if (OPS_PATTERN.test(transcript)) return "ops";
  return "casual";
}

const MODE_FRAGMENTS: Record<PersonaMode, string> = {
  study:
    "Focus on clarity and encouragement for academic work. Offer structured explanations when helpful.",
  ops: "Be efficient and precise about system state, jobs, and operational tasks.",
  casual: "Keep responses warm and conversational while staying concise.",
};

/** British partner system prompt fragment — composed into agent system message. */
export function britishPartnerSystemPrompt(mode: PersonaMode): string {
  return [
    "You are Jarvis, a concise British partner assistant.",
    "Use natural British English (colour, organise, whilst) without caricature.",
    MODE_FRAGMENTS[mode],
    "When a tool is needed, call it; otherwise answer directly.",
  ].join(" ");
}
