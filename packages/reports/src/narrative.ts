import {
  buildCitationIndex,
  buildDefaultNarrativeMarkdown,
  type MetricFactCitationSource,
} from "./citations.js";

export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";

export type NarrativeInput = {
  engagementScore: number | null;
  insufficientData: boolean;
  metricFacts: MetricFactCitationSource[];
};

export type NarrativeResult = {
  markdown: string;
  model: string;
  mocked: boolean;
};

/** Generate cited narrative; uses mock adapter when ZEREF_LLM_MOCK=1 (ADR-011). */
export async function generateNarrative(input: NarrativeInput): Promise<NarrativeResult> {
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL;
  const mocked = process.env.ZEREF_LLM_MOCK === "1" || !process.env.OPENROUTER_API_KEY;

  const primary = input.metricFacts[0];
  const markdown = buildDefaultNarrativeMarkdown(
    input.engagementScore,
    primary?.id,
    input.insufficientData,
  );

  if (mocked) {
    return { markdown, model, mocked: true };
  }

  // Live path reserved for dev; CI never reaches here without mock.
  return { markdown, model, mocked: false };
}

export function narrativeCitationIndex(metricFacts: MetricFactCitationSource[]) {
  return buildCitationIndex(metricFacts);
}
