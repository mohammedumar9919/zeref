/** True when CI mock path returns synchronous 200 JSON (Phase 6 Amendment A). */
export function isCiVoiceMockMode(): boolean {
  return (
    process.env.ZEREF_WHISPER_MOCK === "1" &&
    process.env.ZEREF_TTS_MOCK === "1" &&
    process.env.ZEREF_LLM_MOCK === "1"
  );
}

export function isWhisperMockEnabled(): boolean {
  return process.env.ZEREF_WHISPER_MOCK === "1";
}

export function isTtsMockEnabled(): boolean {
  return process.env.ZEREF_TTS_MOCK === "1";
}

export function isLlmMockEnabled(): boolean {
  return process.env.ZEREF_LLM_MOCK === "1";
}

export function getVoiceMockFlags(): {
  ZEREF_WHISPER_MOCK: boolean;
  ZEREF_TTS_MOCK: boolean;
  ZEREF_LLM_MOCK: boolean;
} {
  return {
    ZEREF_WHISPER_MOCK: isWhisperMockEnabled(),
    ZEREF_TTS_MOCK: isTtsMockEnabled(),
    ZEREF_LLM_MOCK: isLlmMockEnabled(),
  };
}
