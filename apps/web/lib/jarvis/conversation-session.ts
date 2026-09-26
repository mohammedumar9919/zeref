/**
 * In-memory multi-turn voice session for JARVIS.
 * Each PTT turn was previously isolated — this keeps recent dialogue + offers.
 */

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ConversationSessionSnapshot = {
  turns: ConversationTurn[];
  pendingOffer: string | null;
  lastCompetitorUsernames: string[];
  lastToolNames: string[];
};

const MAX_TURNS = 8;
const HANDLE_RE = /@([A-Za-z0-9._]{2,30})/g;

let turns: ConversationTurn[] = [];
let pendingOffer: string | null = null;
let lastCompetitorUsernames: string[] = [];
let lastToolNames: string[] = [];

export function resetConversationSessionForTests(): void {
  turns = [];
  pendingOffer = null;
  lastCompetitorUsernames = [];
  lastToolNames = [];
}

export function getConversationSessionSnapshot(): ConversationSessionSnapshot {
  return {
    turns: [...turns],
    pendingOffer,
    lastCompetitorUsernames: [...lastCompetitorUsernames],
    lastToolNames: [...lastToolNames],
  };
}

function extractHandles(text: string): string[] {
  const found: string[] = [];
  HANDLE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HANDLE_RE.exec(text)) !== null) {
    const handle = match[1].toLowerCase();
    if (!found.includes(handle)) found.push(handle);
  }
  return found;
}

function looksLikeFollowUpOffer(assistantText: string): boolean {
  return /\b(would you like|want (me )?to|shall i|more about|dig (deeper|into)|their performance|go further|hear more|tell you more|look into)\b/i.test(
    assistantText,
  );
}

function derivePendingOffer(assistantText: string): string | null {
  if (!looksLikeFollowUpOffer(assistantText)) return null;
  const handles = extractHandles(assistantText);
  if (handles.length > 0) {
    return `Continue the offered follow-up about @${handles.join(", @")} — call discover_competitor and/or get_instagram_insights as appropriate; do not ask how you can assist.`;
  }
  if (lastCompetitorUsernames.length > 0) {
    return `Continue the offered follow-up about @${lastCompetitorUsernames.join(", @")} performance — call discover_competitor; do not ask how you can assist.`;
  }
  if (/\b(competitor|creators?|accounts?)\b/i.test(assistantText)) {
    return `Continue the competitor follow-up you offered. If no @handle is in prior context, ask once for a specific Business/Creator username then call discover_competitor — do not say only "how can I assist".`;
  }
  if (lastToolNames.includes("get_instagram_account_snapshot") || lastToolNames.includes("get_instagram_insights")) {
    return `Continue the offered follow-up on the operator's own Instagram performance — call get_instagram_insights and/or get_instagram_account_snapshot; do not ask how you can assist.`;
  }
  return `Continue the follow-up you just offered in the prior turn. Use tools as needed; do not reset with "how can I assist".`;
}

export function isShortAffirmative(transcript: string): boolean {
  const t = transcript.trim();
  if (!t || t.length > 80) return false;
  // "Yes", "Yes.", "Yes, I'm listening." — any short yes-family opener
  if (/^(yes|yeah|yep|yup|sure|ok|okay)\b/i.test(t)) return true;
  if (/^(please|go ahead|do it|continue|more|tell me more)\b[\s.!?]*$/i.test(t)) {
    return true;
  }
  if (/^i('m| am) listening\b/i.test(t)) return true;
  return false;
}

export function isVaguePerformanceFollowUp(transcript: string): boolean {
  return /\b(their|them|that|those|the competitor|competitors?)\b/i.test(transcript) &&
    /\b(performance|posting|doing|stats|insights|numbers)\b/i.test(transcript);
}

/**
 * Expand short/vague follow-ups using session state so the LLM sees intent + entities.
 */
export function resolveConversationalTranscript(transcript: string): {
  transcript: string;
  expanded: boolean;
} {
  const trimmed = transcript.trim();
  if (!trimmed) return { transcript: trimmed, expanded: false };

  if (isShortAffirmative(trimmed) && pendingOffer) {
    return {
      transcript: `Operator affirmed the prior offer. ${pendingOffer} Original utterance: "${trimmed}"`,
      expanded: true,
    };
  }

  if (isVaguePerformanceFollowUp(trimmed) && lastCompetitorUsernames.length > 0) {
    return {
      transcript: `${trimmed} (Context: referring to @${lastCompetitorUsernames.join(", @")} from earlier in this conversation. Call discover_competitor.)`,
      expanded: true,
    };
  }

  if (isVaguePerformanceFollowUp(trimmed) && pendingOffer) {
    return {
      transcript: `${trimmed} (Context: ${pendingOffer})`,
      expanded: true,
    };
  }

  return { transcript: trimmed, expanded: false };
}

/** Prior turns for the ReAct message list (excludes the current user utterance). */
export function getConversationHistoryForLlm(): Array<{
  role: "user" | "assistant";
  content: string;
}> {
  return turns.slice(-MAX_TURNS).map((t) => ({
    role: t.role,
    content: t.content.slice(0, 1200),
  }));
}

export function recordUserTurn(text: string): void {
  turns.push({ role: "user", content: text.trim().slice(0, 1200) });
  if (turns.length > MAX_TURNS) turns = turns.slice(-MAX_TURNS);
}

export function recordAssistantTurn(
  text: string,
  toolCalls?: Array<{ name: string; args?: Record<string, unknown>; result?: unknown }>,
): void {
  turns.push({ role: "assistant", content: text.trim().slice(0, 1200) });
  if (turns.length > MAX_TURNS) turns = turns.slice(-MAX_TURNS);

  if (toolCalls && toolCalls.length > 0) {
    lastToolNames = toolCalls.map((c) => c.name);
    const fromArgs: string[] = [];
    for (const call of toolCalls) {
      if (call.name === "discover_competitor") {
        const u = call.args?.username;
        if (typeof u === "string" && u.trim()) {
          fromArgs.push(u.replace(/^@/, "").toLowerCase());
        }
      }
      if (call.name === "suggest_reel_ideas") {
        const list = call.args?.competitorUsernames;
        if (Array.isArray(list)) {
          for (const item of list) {
            if (typeof item === "string" && item.trim()) {
              fromArgs.push(item.replace(/^@/, "").toLowerCase());
            }
          }
        }
      }
      const resultText = typeof call.result === "string"
        ? call.result
        : JSON.stringify(call.result ?? {});
      fromArgs.push(...extractHandles(resultText));
      const usernameMatch = resultText.match(/"username"\s*:\s*"([^"]+)"/i);
      if (usernameMatch?.[1]) fromArgs.push(usernameMatch[1].toLowerCase());
    }
    if (fromArgs.length > 0) {
      lastCompetitorUsernames = [...new Set(fromArgs)].slice(0, 5);
    }
  }

  const handlesInText = extractHandles(text);
  if (handlesInText.length > 0) {
    lastCompetitorUsernames = [...new Set([...handlesInText, ...lastCompetitorUsernames])].slice(0, 5);
  }

  pendingOffer = derivePendingOffer(text);
}
