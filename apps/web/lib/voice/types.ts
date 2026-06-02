type VoiceTurnToolCall = {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  durationMs?: number;
};

export type VoiceTurnAcceptedResponse = {
  turnId: string;
  transcript: string;
};

export type VoiceTurnAudioBlob = {
  audioBase64: string;
  mimeType: "audio/mpeg" | "audio/wav";
};

/** CI mock synchronous response (Amendment A). */
export type VoiceTurnSyncResponse = {
  mode: "sync-mock";
  turnId: string;
  transcript: string;
  ackText: string;
  resultText: string;
  globeState: "speaking";
  toolCalls: VoiceTurnToolCall[];
  ackAudio: VoiceTurnAudioBlob;
  resultAudio: VoiceTurnAudioBlob;
};

export type VoiceHealthResponse = {
  whisper: {
    mock: boolean;
    url: string;
    reachable: boolean;
    model?: string;
  };
  flags: {
    ZEREF_WHISPER_MOCK: boolean;
    ZEREF_TTS_MOCK: boolean;
    ZEREF_LLM_MOCK: boolean;
  };
};
