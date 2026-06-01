const DEFAULT_HALF_LIFE_DAYS = 30;

export function getHalfLifeDays(): number {
  const raw = process.env.ZEREF_MEMORY_HALF_LIFE_DAYS;
  if (!raw) {
    return DEFAULT_HALF_LIFE_DAYS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HALF_LIFE_DAYS;
}

/** Exponential decay with 30-day half-life (ADR-025). */
export function temporalScore(createdAt: Date, now: Date = new Date()): number {
  const halfLifeDays = getHalfLifeDays();
  const msPerDay = 86_400_000;
  const ageDays = Math.max(0, (now.getTime() - createdAt.getTime()) / msPerDay);
  const score = 0.5 ** (ageDays / halfLifeDays);
  return Math.min(1, Math.max(0, score));
}
