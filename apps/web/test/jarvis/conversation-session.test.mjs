import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "../..");

const {
  resetConversationSessionForTests,
  resolveConversationalTranscript,
  recordAssistantTurn,
  recordUserTurn,
  getConversationHistoryForLlm,
  getConversationSessionSnapshot,
  isShortAffirmative,
} = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/conversation-session.ts")).href
);

afterEach(() => {
  resetConversationSessionForTests();
});

describe("conversation-session continuity", () => {
  it("treats yes / listening as short affirmatives", () => {
    assert.equal(isShortAffirmative("Yes"), true);
    assert.equal(isShortAffirmative("Yes, I'm listening."), true);
    assert.equal(isShortAffirmative("tell me more"), true);
    assert.equal(isShortAffirmative("So how many reels did I post today?"), false);
  });

  it("expands yes after an offered competitor follow-up with @handle", () => {
    recordAssistantTurn(
      "I found @nasa posting launch reels. Would you like to know more about their performance?",
    );
    const snap = getConversationSessionSnapshot();
    assert.ok(snap.pendingOffer);
    assert.ok(snap.lastCompetitorUsernames.includes("nasa"));

    const resolved = resolveConversationalTranscript("Yes, I'm listening.");
    assert.equal(resolved.expanded, true);
    assert.match(resolved.transcript, /nasa/i);
    assert.match(resolved.transcript, /affirmed|follow-up|Continue/i);
    assert.doesNotMatch(resolved.transcript, /^Yes, I'm listening\.?$/i);
  });

  it("resolves their performance to prior competitor handle", () => {
    recordAssistantTurn("Competitor @ducati is strong on Reels this week.");
    const resolved = resolveConversationalTranscript(
      "Tell me more about their performance.",
    );
    assert.equal(resolved.expanded, true);
    assert.match(resolved.transcript, /ducati/i);
    assert.match(resolved.transcript, /discover_competitor/i);
  });

  it("keeps rolling history for the LLM", () => {
    recordUserTurn("What's up, Jarvis?");
    recordAssistantTurn("All systems nominal.");
    recordUserTurn("How many reels today?");
    recordAssistantTurn("You posted two Reels today.");
    const history = getConversationHistoryForLlm();
    assert.ok(history.length >= 4);
    assert.equal(history[0].role, "user");
    assert.equal(history.at(-1)?.role, "assistant");
  });
});
