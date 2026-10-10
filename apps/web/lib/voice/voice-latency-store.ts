import {
  FIRST_AUDIO_TARGET_MS,
  VoiceLatencySampleSchema,
  type VoiceLatencySample,
} from "@zeref/contracts";

export const VOICE_LATENCY_RING_SIZE = 100;

type StoredSample = VoiceLatencySample & { receivedAt: string };

export type VoiceLatencySummary = {
  count: number;
  p50Ms: number | null;
  p95Ms: number | null;
  targetMs: number;
  lastSampleAt: string | null;
};

const ring: StoredSample[] = [];

/** Nearest-rank percentile over ascending values; null when there is no data. */
export function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  const rank = Math.ceil((p / 100) * sortedAsc.length);
  const index = Math.min(sortedAsc.length - 1, Math.max(0, rank - 1));
  return sortedAsc[index]!;
}

/** Validate and store one client sample; oldest samples drop past the ring size. */
export function recordVoiceLatencySample(
  input: unknown,
  receivedAt: string = new Date().toISOString(),
): { ok: true; sample: VoiceLatencySample } | { ok: false; error: string } {
  const parsed = VoiceLatencySampleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid sample" };
  }
  ring.push({ ...parsed.data, receivedAt });
  while (ring.length > VOICE_LATENCY_RING_SIZE) {
    ring.shift();
  }
  return { ok: true, sample: parsed.data };
}

/** Summary over real samples only; empty buffer reports count 0 and null percentiles. */
export function getVoiceLatencySummary(): VoiceLatencySummary {
  const values = ring.map((s) => s.firstAudioMs).sort((a, b) => a - b);
  return {
    count: values.length,
    p50Ms: percentile(values, 50),
    p95Ms: percentile(values, 95),
    targetMs: FIRST_AUDIO_TARGET_MS,
    lastSampleAt: ring.length > 0 ? ring[ring.length - 1]!.receivedAt : null,
  };
}

export function resetVoiceLatencyStoreForTests(): void {
  ring.length = 0;
}
