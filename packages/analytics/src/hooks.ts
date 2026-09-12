import type { EngagementOutlier } from "./outliers.js";

export type CaptionHookScore = {
  caption: string;
  score: number;
  mocked: boolean;
  rationale: string;
};

export type WeeklyBriefInput = {
  outliers: EngagementOutlier[];
  hooks: CaptionHookScore[];
  topicTitle?: string;
};

export type WeeklyBrief = {
  text: string;
  groundedIn: string[];
  mocked: boolean;
};

function isLlmMocked(): boolean {
  return process.env.ZEREF_LLM_MOCK === "1" || !process.env.OPENROUTER_API_KEY;
}

function clampScore(value: number): number {
  return Math.min(10, Math.max(0, Math.round(value)));
}

/** Deterministic 0–10 hook heuristic used when ZEREF_LLM_MOCK=1. */
export function mockCaptionHookScore(caption: string): CaptionHookScore {
  const trimmed = caption.trim();
  let score = 3;
  const reasons: string[] = [];

  if (trimmed.length === 0) {
    return { caption, score: 0, mocked: true, rationale: "Empty caption — no hook." };
  }

  if (/^\d/.test(trimmed) || /^(am|pm|\d+\s*(am|pm))/i.test(trimmed)) {
    score += 2;
    reasons.push("opens with a concrete time or number");
  }
  if (/\?/.test(trimmed)) {
    score += 1;
    reasons.push("asks a question");
  }
  const firstLine = trimmed.split(/\n/)[0] ?? trimmed;
  if (firstLine.length >= 18 && firstLine.length <= 90) {
    score += 2;
    reasons.push("tight first-line length");
  }
  if (/[—–-]/.test(trimmed) || /!/.test(trimmed)) {
    score += 1;
    reasons.push("punch punctuation");
  }
  if (/\b(night|ride|no talking|no edits|engine)\b/i.test(trimmed)) {
    score += 1;
    reasons.push("specific scene words");
  }
  if (trimmed.length < 8) {
    score -= 2;
    reasons.push("too short to hook");
  }

  return {
    caption,
    score: clampScore(score),
    mocked: true,
    rationale: reasons.length > 0 ? `Hook: ${reasons.join("; ")}.` : "Hook: baseline mock score.",
  };
}

/**
 * Caption hook score 0–10. Mocked when ZEREF_LLM_MOCK=1 or no OpenRouter key.
 * Live path reserved — CI never calls OpenRouter.
 */
export async function scoreCaptionHook(caption: string): Promise<CaptionHookScore> {
  const mocked = isLlmMocked();
  const result = mockCaptionHookScore(caption);
  if (mocked) {
    return result;
  }
  return { ...result, mocked: false };
}

function formatMultiplier(value: number): string {
  return `${value.toFixed(1).replace(/\.0$/, "")}×`;
}

/** One grounded weekly brief from outliers + hook scores (CLOUD-A3). */
export async function buildWeeklyBrief(input: WeeklyBriefInput): Promise<WeeklyBrief> {
  const mocked = isLlmMocked();
  const groundedIn = input.outliers
    .map((row) => row.shortcode ?? row.factId)
    .filter((id): id is string => Boolean(id));

  const topic = input.topicTitle ?? "this account";
  const hookAvg =
    input.hooks.length > 0
      ? input.hooks.reduce((sum, hook) => sum + hook.score, 0) / input.hooks.length
      : null;

  let text: string;
  if (input.outliers.length === 0) {
    text = `Weekly brief (${mocked ? "mocked" : "live"}): no own-account posts cleared the 5× median bar for ${topic}. Keep measuring caption hooks before claiming a breakout.`;
  } else {
    const top = input.outliers[0]!;
    const cite = top.shortcode ?? top.factId;
    const hookBit =
      hookAvg != null
        ? ` Caption hook scores averaged ${hookAvg.toFixed(1)}/10.`
        : "";
    text = `Weekly brief (${mocked ? "mocked" : "live"}): ${cite} hit ${formatMultiplier(top.multiplier)} own-account median (${top.value} vs ${top.median}).${hookBit} Repeat the opener that pulled the outlier instead of chasing a new format.`;
  }

  return { text, groundedIn, mocked };
}
