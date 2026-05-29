/** Minimal platform account shape for cohort helpers. */
export type CohortAccount = {
  platformAccountId: string;
  username?: string;
  followerCount?: number;
};

/** Stable cohort bucket key (account-scoped analytics). */
export function cohortKey(account: CohortAccount): string {
  return account.platformAccountId;
}

/**
 * Denominator for relative engagement; defaults to 100 when followers unknown.
 */
export function accountEngagementBaseline(followerCount?: number): number {
  if (followerCount == null || !Number.isFinite(followerCount) || followerCount <= 0) {
    return 100;
  }
  return followerCount;
}

/** Engagement score indexed against an account follower baseline. */
export function relativeEngagement(
  engagementScore: number,
  followerCount?: number,
): number {
  const baseline = accountEngagementBaseline(followerCount);
  return Number(((engagementScore / baseline) * 100).toFixed(6));
}

/** Whether two accounts belong to the same cohort bucket. */
export function sameCohort(a: CohortAccount, b: CohortAccount): boolean {
  return cohortKey(a) === cohortKey(b);
}
