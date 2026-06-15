import type {
  LlmPort,
  LlmPredictInput,
  LlmPredictResult,
  ToolDescriptor,
} from "@zeref/jarvis-kernel";

import { isLlmMockEnabled } from "../voice/mock-flags";

const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";

function pickMockToolCall(
  transcript: string,
  tools: ToolDescriptor[],
): LlmPredictResult["toolCall"] | undefined {
  const lower = transcript.toLowerCase();
  const has = (name: string) => tools.some((t) => t.name === name);

  if (/(enqueue|queue|report job|normalize job)/i.test(lower) && has("enqueue_job")) {
    return { name: "enqueue_job", args: { jobType: "report" }, id: "mock-tc-enqueue" };
  }
  if (/(schedule|calendar|book)/i.test(lower) && has("create_calendar_event")) {
    return {
      name: "create_calendar_event",
      args: {
        title: "Jarvis scheduled event",
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      },
      id: "mock-tc-calendar",
    };
  }
  if (/(cockpit|dashboard|panels?)/i.test(lower) && has("get_cockpit_summary")) {
    return { name: "get_cockpit_summary", args: {}, id: "mock-tc-cockpit" };
  }
  if (/(report|headline|elite)/i.test(lower) && has("get_latest_report_headline")) {
    return { name: "get_latest_report_headline", args: {}, id: "mock-tc-headline" };
  }
  if (/(pipeline|worker|queue status)/i.test(lower) && has("get_pipeline_status")) {
    return { name: "get_pipeline_status", args: {}, id: "mock-tc-pipeline" };
  }
  if (/(remember this|save this|note this)/i.test(lower) && has("memory_save")) {
    return {
      name: "memory_save",
      args: { content: transcript },
      id: "mock-tc-memory-save",
    };
  }
  if (/(recall|remember|previously)/i.test(lower) && has("memory_search")) {
    return { name: "memory_search", args: { query: transcript }, id: "mock-tc-memory-search" };
  }

  return undefined;
}

function buildMockFinishText(toolName: string | undefined, transcript: string): string {
  if (!toolName) {
    return `Right then — I heard: ${transcript}`;
  }
  switch (toolName) {
    case "get_cockpit_summary":
      return "Cockpit summary is ready — studio, calendar, reports, and research panels are available.";
    case "get_latest_report_headline":
      return "Your latest elite report headline is on the reports panel.";
    case "get_pipeline_status":
      return "Pipeline status checked — see tool result for worker state.";
    case "enqueue_job":
      return "Job enqueued successfully.";
    case "create_calendar_event":
      return "Calendar event created.";
    case "memory_save":
      return "Noted — I've saved that to memory.";
    case "memory_search":
      return "Here's what I found in memory.";
    default:
      return `Done — ${toolName} completed.`;
  }
}

type MockScriptState = {
  pass: number;
  lastTool?: string;
};

/** LlmPort wrapping mock or OpenRouter (C144, ZEREF_LLM_MOCK). */
export function createJarvisLlmPort(scriptState?: MockScriptState): LlmPort {
  const state = scriptState ?? { pass: 0 };

  return {
    async predict(input: LlmPredictInput): Promise<LlmPredictResult> {
      const mocked = isLlmMockEnabled() || !process.env.OPENROUTER_API_KEY;
      const userMessage = [...input.messages].reverse().find((m) => m.role === "user");
      const transcript = userMessage?.content ?? "";

      if (mocked) {
        const lastToolMessage = [...input.messages]
          .reverse()
          .find((m) => m.role === "tool");
        if (lastToolMessage) {
          let toolName: string | undefined;
          try {
            const priorAssistant = [...input.messages]
              .reverse()
              .find((m) => m.role === "assistant");
            if (priorAssistant) {
              const call = JSON.parse(priorAssistant.content) as {
                toolCall?: { name?: string };
              };
              toolName = call.toolCall?.name;
            }
          } catch {
            toolName = state.lastTool;
          }
          state.pass += 1;
          return {
            text: buildMockFinishText(toolName, transcript),
            tokensUsed: 24,
          };
        }

        const toolCall = pickMockToolCall(transcript, input.tools);
        if (toolCall) {
          state.lastTool = toolCall.name;
          state.pass += 1;
          return { toolCall, tokensUsed: 32 };
        }

        state.pass += 1;
        return { text: buildMockFinishText(undefined, transcript), tokensUsed: 16 };
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL,
          messages: input.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          tools: input.tools.map((t) => ({
            type: "function",
            function: {
              name: t.name,
              description: t.description,
              parameters: { type: "object", additionalProperties: true },
            },
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter request failed: ${response.status}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
            tool_calls?: Array<{
              id?: string;
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
        usage?: { total_tokens?: number };
      };

      const message = payload.choices?.[0]?.message;
      const toolCall = message?.tool_calls?.[0];
      if (toolCall?.function?.name) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.function.arguments ?? "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }
        return {
          toolCall: {
            name: toolCall.function.name,
            args,
            id: toolCall.id,
          },
          tokensUsed: payload.usage?.total_tokens,
        };
      }

      const text = message?.content?.trim();
      if (!text) {
        throw new Error("OpenRouter returned empty content");
      }
      return { text, tokensUsed: payload.usage?.total_tokens };
    },
  };
}
