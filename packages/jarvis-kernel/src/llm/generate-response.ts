import type { JarvisToolCall } from "@zeref/contracts";
import type { LlmAdapter, LlmGenerateInput, LlmGenerateResult } from "../types.js";

export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";

function buildMockResult(input: LlmGenerateInput): string {
  const tool = input.toolCalls[0];
  if (!tool) {
    return `I heard: ${input.transcript}`;
  }

  const result = tool.result as { headline?: string; message?: string; status?: string };
  if (tool.name === "get_latest_report_headline" && result.headline) {
    return `Your latest elite report headline is ${result.headline}.`;
  }
  if (tool.name === "get_pipeline_status") {
    if (result.status === "unavailable") {
      return "Pipeline status is unavailable because the worker daemon is not running.";
    }
    return `Pipeline status: ${result.message ?? result.status}.`;
  }
  if (tool.name === "get_cockpit_summary") {
    return "Cockpit summary is ready — studio, calendar, reports, and research panels are available.";
  }
  return `Here's what I found from ${tool.name}.`;
}

export const defaultLlmAdapter: LlmAdapter = async (input) => {
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL;
  const mocked =
    process.env.ZEREF_LLM_MOCK === "1" || !process.env.OPENROUTER_API_KEY;

  if (mocked) {
    return {
      text: buildMockResult(input),
      model,
      mocked: true,
    };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are Jarvis, a concise British assistant. Answer in one or two sentences using tool results.",
        },
        {
          role: "user",
          content: JSON.stringify({
            transcript: input.transcript,
            toolCalls: input.toolCalls,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenRouter returned empty content");
  }

  return { text, model, mocked: false };
};

export type { LlmGenerateResult };
