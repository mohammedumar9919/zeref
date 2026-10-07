import type {
  LlmPort,
  LlmPredictInput,
  LlmPredictResult,
  LlmStreamHandlers,
  ToolDescriptor,
} from "@zeref/jarvis-kernel";

import { isLlmMockEnabled } from "../voice/mock-flags";

const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";

type OpenRouterChatMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; content: string; tool_call_id: string };

/** Map kernel LlmMessage[] into OpenAI/OpenRouter chat tool protocol. */
export function toOpenRouterMessages(
  messages: LlmPredictInput["messages"],
): OpenRouterChatMessage[] {
  return messages.map((m): OpenRouterChatMessage => {
    if (m.role === "tool") {
      return {
        role: "tool",
        content: m.content,
        tool_call_id: m.toolCallId ?? "call_missing",
      };
    }

    if (m.role === "assistant") {
      try {
        const parsed = JSON.parse(m.content) as {
          toolCall?: { name?: string; args?: Record<string, unknown>; id?: string };
        };
        if (parsed.toolCall?.name) {
          const id = parsed.toolCall.id ?? m.toolCallId ?? `call_${parsed.toolCall.name}`;
          return {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id,
                type: "function",
                function: {
                  name: parsed.toolCall.name,
                  arguments: JSON.stringify(parsed.toolCall.args ?? {}),
                },
              },
            ],
          };
        }
      } catch {
        /* plain assistant text */
      }
      return { role: "assistant", content: m.content };
    }

    return { role: m.role, content: m.content };
  });
}

function openRouterToolParams(tools: ToolDescriptor[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: { type: "object", properties: {}, additionalProperties: true },
    },
  }));
}

const POST_VS_USUAL =
  /\b(last|latest|recent) post\b.*\b(usual|average|normal|baseline|compare)|\bhow did my (last|latest|recent) post do\b/;
const MEMORY_RECALL =
  /\bwhat (did|have) i (ask(ed)?|tell|told) you to remember\b|\bwhat do you remember\b|\bwhat have you (saved|remembered)\b/;

/** "Delete all my data" / "forget everything" — never mapped to a tool. */
function isBulkDeleteRequest(lower: string): boolean {
  return (
    /\b(delete|wipe|erase|forget|clear|remove|destroy)\b/.test(lower) &&
    /\b(all|everything|every)\b/.test(lower)
  );
}

const BULK_DELETE_REFUSAL =
  "I can't delete all your data in one go — that's not something I'm allowed to do. " +
  'I can forget a specific item from your vault, though: say "forget" followed by what you pinned.';

const CAPABILITY_HELP =
  "I'm not sure how to help with that yet. I can read your latest report headline, compare your last post " +
  "with your usual, show the cockpit or pipeline status, recall what you've asked me to remember, " +
  "pin or forget vault items, and queue report jobs.";

function pickMockToolCall(
  transcript: string,
  tools: ToolDescriptor[],
): LlmPredictResult["toolCall"] | undefined {
  const lower = transcript.toLowerCase();
  const has = (name: string) => tools.some((t) => t.name === name);

  if (isBulkDeleteRequest(lower)) return undefined;
  if (POST_VS_USUAL.test(lower) && has("get_report_artifact")) {
    return { name: "get_report_artifact", args: {}, id: "mock-tc-post-vs-usual" };
  }
  if (MEMORY_RECALL.test(lower) && has("memory_search")) {
    return { name: "memory_search", args: { query: "" }, id: "mock-tc-memory-recall" };
  }
  if (/\bforget\b/.test(lower) && has("vault_forget")) {
    const target = transcript
      .replace(/^.*?\bforget\b\s*(about\s+)?((that|this|it|the pin)\b)?\s*[:,-]?\s*/i, "")
      .trim();
    return {
      name: "vault_forget",
      args: target ? { content: target } : {},
      id: "mock-tc-vault-forget",
    };
  }
  const asksAboutPins =
    /\b(pinned|vault|my pins)\b/.test(lower) ||
    (/\bpins?\b/.test(lower) && /^(what|which|show|list|did|do|have|any)\b|\?\s*$/.test(lower.trim()));
  if (asksAboutPins && has("vault_list")) {
    return { name: "vault_list", args: {}, id: "mock-tc-vault-list" };
  }
  if (/\bpin\b/.test(lower) && has("vault_pin")) {
    const content = transcript
      .replace(/^.*?\bpin\b\s*((this|that|it)\b)?\s*[:,-]?\s*/i, "")
      .trim();
    if (content) {
      return {
        name: "vault_pin",
        args: { content },
        id: "mock-tc-vault-pin",
      };
    }
  }
  if (/(make a report|generate a report|new report|performance report)/i.test(lower) && has("request_performance_report")) {
    return { name: "request_performance_report", args: {}, id: "mock-tc-perf-report" };
  }
  if (/(collect|refresh).*(instagram|data)/i.test(lower) && has("enqueue_job")) {
    return { name: "enqueue_job", args: { jobType: "collect" }, id: "mock-tc-enqueue-collect" };
  }
  if (/(enqueue|queue|report job|normalize job)/i.test(lower) && has("enqueue_job")) {
    return { name: "enqueue_job", args: { jobType: "report" }, id: "mock-tc-enqueue" };
  }
  const handleMatch = transcript.match(/@([A-Za-z0-9._]{1,30})/);
  if (handleMatch && has("discover_competitor")) {
    return {
      name: "discover_competitor",
      args: { username: handleMatch[1] },
      id: "mock-tc-discover-competitor",
    };
  }
  // Vague "my competitors" without @handle — do not invent a username; use reel/market tools instead.
  if (
    /\b(competitor|business discovery|other creator)s?\b/i.test(lower) &&
    has("suggest_reel_ideas")
  ) {
    return {
      name: "suggest_reel_ideas",
      args: { query: transcript },
      id: "mock-tc-competitor-vague",
    };
  }
  if (
    /(go viral|will .+ viral|viral prediction|posted today)/i.test(lower) &&
    has("get_instagram_account_snapshot")
  ) {
    return {
      name: "get_instagram_account_snapshot",
      args: {},
      id: "mock-tc-viral-honesty",
    };
  }
  if (
    /(what reels should i make|reel ideas|viral|external trend|market trend|tiktok|facebook trend)/i.test(
      lower,
    ) &&
    has("suggest_reel_ideas")
  ) {
    return {
      name: "suggest_reel_ideas",
      args: { query: transcript },
      id: "mock-tc-reel-ideas",
    };
  }
  if (/(viral|external trend|market trend|tiktok|facebook trend)/i.test(lower) && has("research_external_trends")) {
    return {
      name: "research_external_trends",
      args: { query: transcript },
      id: "mock-tc-ext-research",
    };
  }
  if (/(insight|reach|views|profile visit)/i.test(lower) && has("get_instagram_insights")) {
    return { name: "get_instagram_insights", args: {}, id: "mock-tc-ig-insights" };
  }
  if (/(how many (reels|posts)|account snapshot|instagram account)/i.test(lower) && has("get_instagram_account_snapshot")) {
    return { name: "get_instagram_account_snapshot", args: {}, id: "mock-tc-ig-snap" };
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
  if (/(outlier|overperform|5x|5×)/i.test(lower) && has("get_research_outliers")) {
    return { name: "get_research_outliers", args: {}, id: "mock-tc-outliers" };
  }
  if (/(weekly brief|research brief|weekly research)/i.test(lower) && has("get_weekly_brief")) {
    return { name: "get_weekly_brief", args: {}, id: "mock-tc-brief" };
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

type VaultResultData = {
  item?: { content?: string };
  alreadyPinned?: boolean;
  items?: Array<{ content?: string }>;
  deleted?: boolean;
  content?: string;
};

type ReadResultData = {
  available?: boolean;
  headline?: string;
  results?: Array<{ content?: string }>;
  report?: {
    engagement?: { score?: number; vsCohort?: string };
    cohort?: { sampleSize?: number };
  };
};

type ToolResultData = VaultResultData & ReadResultData;

const LOW_CONFIDENCE_SAMPLE = 5;

function describeUsual(vsCohort: string | undefined): string {
  switch (vsCohort) {
    case "above":
      return "above your usual";
    case "inline":
      return "in line with your usual";
    case "below":
      return "below your usual";
    default:
      return "not comparable with your usual yet";
  }
}

function buildReadFinishText(toolName: string, data: ToolResultData | undefined): string | undefined {
  if (!data) return undefined;
  switch (toolName) {
    case "get_latest_report_headline":
      if (data.available === false || !data.headline) return "There's no saved report headline yet.";
      return `Your latest report says: "${data.headline}"`;
    case "memory_search": {
      const contents = [
        ...new Set((data.results ?? []).map((r) => r.content).filter((c): c is string => Boolean(c))),
      ];
      if (contents.length === 0) return "Nothing saved yet — ask me to remember something first.";
      const shown = contents.slice(0, 3).map((c) => `"${c}"`).join("; ");
      return `Here's what you've asked me to remember: ${shown}.`;
    }
    case "get_report_artifact": {
      const score = data.report?.engagement?.score;
      if (data.available === false || typeof score !== "number") {
        return "I can't find a saved report for your last post yet.";
      }
      const sampleSize = data.report?.cohort?.sampleSize;
      const confidence =
        typeof sampleSize === "number" && sampleSize < LOW_CONFIDENCE_SAMPLE
          ? ` Low confidence — not enough history yet (compared against ${sampleSize} ${sampleSize === 1 ? "post" : "posts"}).`
          : "";
      return `Your last post scored ${score.toFixed(1)} for engagement — ${describeUsual(data.report?.engagement?.vsCohort)}.${confidence}`;
    }
    default:
      return undefined;
  }
}

function readToolData(toolMessageContent: string | undefined): ToolResultData | undefined {
  if (!toolMessageContent) return undefined;
  try {
    const parsed = JSON.parse(toolMessageContent) as { ok?: boolean; data?: ToolResultData };
    return parsed.ok === false ? undefined : parsed.data;
  } catch {
    return undefined;
  }
}

function buildVaultFinishText(toolName: string, data: VaultResultData | undefined): string | undefined {
  if (!data) return undefined;
  switch (toolName) {
    case "vault_pin": {
      const content = data.item?.content;
      if (!content) return undefined;
      return data.alreadyPinned ? `That's already pinned: "${content}".` : `Pinned: "${content}".`;
    }
    case "vault_list": {
      const contents = [
        ...new Set((data.items ?? []).map((i) => i.content).filter((c): c is string => Boolean(c))),
      ];
      if (contents.length === 0) return "Your vault is empty — nothing pinned yet.";
      const shown = contents.slice(0, 5).map((c) => `"${c}"`).join(", ");
      const more = contents.length > 5 ? ` and ${contents.length - 5} more` : "";
      return `You've pinned ${contents.length === 1 ? "one thing" : `${contents.length} things`}: ${shown}${more}.`;
    }
    case "vault_forget":
      if (data.deleted && data.content) return `Forgotten: "${data.content}".`;
      return "Nothing in your vault matched, so nothing was forgotten.";
    default:
      return undefined;
  }
}

const COLLECT_SIMULATED_TEXT = "Collect queued — simulated in demo mode.";

function isSimulatedCollect(
  toolArgs: Record<string, unknown> | undefined,
  toolMessageContent: string | undefined,
): boolean {
  if (toolArgs?.jobType !== "collect" || !toolMessageContent) return false;
  try {
    const parsed = JSON.parse(toolMessageContent) as {
      ok?: boolean;
      data?: { mocked?: boolean };
      auditMeta?: { simulated?: boolean };
    };
    return parsed.ok !== false && (parsed.auditMeta?.simulated === true || parsed.data?.mocked === true);
  } catch {
    return false;
  }
}

function buildMockFinishText(
  toolName: string | undefined,
  transcript: string,
  toolMessageContent?: string,
  toolArgs?: Record<string, unknown>,
): string {
  if (!toolName) {
    return isBulkDeleteRequest(transcript.toLowerCase()) ? BULK_DELETE_REFUSAL : CAPABILITY_HELP;
  }
  const data = readToolData(toolMessageContent);
  const toolText = buildVaultFinishText(toolName, data) ?? buildReadFinishText(toolName, data);
  if (toolText) return toolText;
  switch (toolName) {
    case "get_cockpit_summary":
      return "Cockpit summary is ready — studio, calendar, reports, and research panels are available.";
    case "get_latest_report_headline":
      return "Your latest elite report headline is on the reports panel.";
    case "request_performance_report":
      return "Fresh performance report job queued.";
    case "research_external_trends":
      return "External social trend research is ready — web-intel, not Graph Insights.";
    case "discover_competitor":
      return "Competitor Business Discovery is ready — Facebook Graph, not Instagram Login.";
    case "suggest_reel_ideas":
      return "Reel ideas are ready — sources labeled web-intel and/or graph-business-discovery.";
    case "get_instagram_account_snapshot":
      return "Instagram account snapshot loaded from Graph media.";
    case "get_instagram_insights":
      return "Instagram Insights loaded from Graph.";
    case "get_pipeline_status":
      return "Pipeline status checked — see tool result for worker state.";
    case "get_research_outliers":
      return "Own-account outliers versus median are on the research hub.";
    case "get_weekly_brief":
      return "Weekly research brief is ready — grounded in the outlier posts.";
    case "enqueue_job":
      return isSimulatedCollect(toolArgs, toolMessageContent)
        ? COLLECT_SIMULATED_TEXT
        : "Job enqueued successfully.";
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

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const err = new Error("aborted");
  err.name = "AbortError";
  throw err;
}

async function emitMockTokens(
  text: string,
  handlers?: LlmStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const parts = text.split(/(\s+)/).filter((part) => part.length > 0);
  for (const part of parts) {
    throwIfAborted(signal);
    handlers?.onToken?.(part);
  }
}

async function predictOpenRouterStream(
  input: LlmPredictInput,
  handlers?: LlmStreamHandlers,
  signal?: AbortSignal,
): Promise<LlmPredictResult> {
  throwIfAborted(signal);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL,
      stream: true,
      messages: toOpenRouterMessages(input.messages),
      tools: openRouterToolParams(input.tools),
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter stream failed: ${response.status}${detail ? ` — ${detail.slice(0, 400)}` : ""}`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  let text = "";
  let toolName: string | undefined;
  let toolId: string | undefined;
  let toolArgs = "";
  let tokensUsed: number | undefined;

  while (true) {
    throwIfAborted(signal);
    const { value, done } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });
    const lines = carry.split("\n");
    carry = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let json: {
        choices?: Array<{
          delta?: {
            content?: string;
            tool_calls?: Array<{
              id?: string;
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
        usage?: { total_tokens?: number };
      };
      try {
        json = JSON.parse(payload) as typeof json;
      } catch {
        continue;
      }
      const delta = json.choices?.[0]?.delta;
      if (delta?.content) {
        text += delta.content;
        handlers?.onToken?.(delta.content);
      }
      const toolDelta = delta?.tool_calls?.[0];
      if (toolDelta?.id) toolId = toolDelta.id;
      if (toolDelta?.function?.name) toolName = toolDelta.function.name;
      if (toolDelta?.function?.arguments) {
        toolArgs += toolDelta.function.arguments;
      }
      if (json.usage?.total_tokens) {
        tokensUsed = json.usage.total_tokens;
      }
    }
  }

  if (toolName) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(toolArgs || "{}") as Record<string, unknown>;
    } catch {
      args = {};
    }
    return { toolCall: { name: toolName, args, id: toolId ?? `call_${toolName}` }, tokensUsed };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("OpenRouter stream returned empty content");
  }
  return { text: trimmed, tokensUsed };
}

/** LlmPort wrapping mock or OpenRouter chat completions (C144, ZEREF_LLM_MOCK). Not Realtime. */
export function createJarvisLlmPort(scriptState?: MockScriptState): LlmPort {
  const state = scriptState ?? { pass: 0 };

  const predict = async (input: LlmPredictInput): Promise<LlmPredictResult> => {
      const mocked = isLlmMockEnabled() || !process.env.OPENROUTER_API_KEY;
      const userMessage = [...input.messages].reverse().find((m) => m.role === "user");
      const transcript = userMessage?.content ?? "";

      if (mocked) {
        const lastToolMessage = [...input.messages]
          .reverse()
          .find((m) => m.role === "tool");
        if (lastToolMessage) {
          let toolName: string | undefined;
          let toolArgs: Record<string, unknown> | undefined;
          try {
            const priorAssistant = [...input.messages]
              .reverse()
              .find((m) => m.role === "assistant");
            if (priorAssistant) {
              const call = JSON.parse(priorAssistant.content) as {
                toolCall?: { name?: string; args?: Record<string, unknown> };
              };
              toolName = call.toolCall?.name;
              toolArgs = call.toolCall?.args;
            }
          } catch {
            toolName = state.lastTool;
          }
          state.pass += 1;
          return {
            text: buildMockFinishText(toolName, transcript, lastToolMessage.content, toolArgs),
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
          messages: toOpenRouterMessages(input.messages),
          tools: openRouterToolParams(input.tools),
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `OpenRouter request failed: ${response.status}${detail ? ` — ${detail.slice(0, 400)}` : ""}`,
        );
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
  };

  return {
    predict,
    async predictStream(
      input: LlmPredictInput,
      handlers?: LlmStreamHandlers,
      signal?: AbortSignal,
    ): Promise<LlmPredictResult> {
      throwIfAborted(signal);
      const mocked = isLlmMockEnabled() || !process.env.OPENROUTER_API_KEY;
      if (mocked) {
        const result = await predict(input);
        if (result.text && !result.toolCall) {
          await emitMockTokens(result.text, handlers, signal);
        }
        return result;
      }
      return predictOpenRouterStream(input, handlers, signal);
    },
  };
}
