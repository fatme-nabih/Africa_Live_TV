export const STREAM_FAILURE_CONFIRMATION_INTERVAL_MS = 15 * 60 * 1_000;
export const PERSISTENT_FAILURE_CONFIRMATION_THRESHOLD = 3;
export const TEMPORARY_FAILURE_CONFIRMATION_THRESHOLD = 5;

const PLAYABLE_STATUSES = new Set(['BROWSER_OK', 'VLC_ONLY']);
const DIRECT_PLAYBACK_STATES = new Set([
  'PUBLIC_DIRECT_WEB',
  'PUBLIC_DIRECT_VLC',
]);
const FAILURE_VERIFICATION_STATES = new Set([
  'TEMPORARY_FAILURE',
  'CONFIRMED_FAILURE',
]);

function timestamp(value: string | null) {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

export type FailedVerificationTransitionInput = {
  now: Date;
  temporaryFailure: boolean;
  status: string;
  verificationState: string;
  directEligibility: string;
  consecutiveFailures: number;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  freshnessTtlMs: number;
};

export function failedVerificationTransition({
  now,
  temporaryFailure,
  status,
  verificationState,
  directEligibility,
  consecutiveFailures,
  lastCheckedAt,
  lastSuccessAt,
  freshnessTtlMs,
}: FailedVerificationTransitionInput) {
  const nowMs = now.getTime();
  const lastCheckMs = timestamp(lastCheckedAt);
  const previousFailureIsTooRecent =
    FAILURE_VERIFICATION_STATES.has(verificationState) &&
    Number.isFinite(lastCheckMs) &&
    lastCheckMs <= nowMs &&
    nowMs - lastCheckMs < STREAM_FAILURE_CONFIRMATION_INTERVAL_MS;
  const failures = previousFailureIsTooRecent
    ? Math.max(consecutiveFailures, 1)
    : consecutiveFailures + 1;
  const threshold = temporaryFailure
    ? TEMPORARY_FAILURE_CONFIRMATION_THRESHOLD
    : PERSISTENT_FAILURE_CONFIRMATION_THRESHOLD;
  const confirmed = failures >= threshold;

  const lastSuccessMs = timestamp(lastSuccessAt);
  const recentSuccess =
    Number.isFinite(lastSuccessMs) &&
    lastSuccessMs <= nowMs &&
    nowMs - lastSuccessMs <= freshnessTtlMs;
  const retainLastKnownGood =
    !confirmed &&
    recentSuccess &&
    PLAYABLE_STATUSES.has(status) &&
    DIRECT_PLAYBACK_STATES.has(directEligibility);

  return {
    failures,
    confirmed,
    previousFailureIsTooRecent,
    recentSuccess,
    retainLastKnownGood,
  };
}
