import { classifyStreamUrl } from './secure-media-assessment';
import {
  directEligibilityStatesForDestination,
  type DirectEligibility,
} from './direct-eligibility';
import { STREAM_FRESHNESS_TTL_MS } from './stream-freshness';

export const PLAYBACK_ATTEMPT_TTL_MS = 6 * 60 * 60 * 1_000;
export const PLAYBACK_SOURCE_FRESHNESS_MS = STREAM_FRESHNESS_TTL_MS;
export const MAX_PLAYBACK_ATTEMPTS_PER_SESSION = 5;

export type PlaybackDestination = 'web' | 'vlc-mobile' | 'vlc-local';

export type PlaybackSourcePolicyInput = {
  url: string;
  status: string;
  corsAllowed: boolean;
  mixedContent: boolean;
  lastSuccessAt: string | null;
  directEligibility: DirectEligibility | string;
  eligibilityReason: string;
};

function hasSensitiveSourceParameters(
  source: ReturnType<typeof classifyStreamUrl>,
  eligibilityReason: string,
) {
  const approvedTimeWindow =
    source.hasReviewableTimeWindowQuery &&
    eligibilityReason.includes('TIME_WINDOW_REVIEWED');
  return (
    source.hasEmbeddedCredentials ||
    source.hasAuthLikeQuery ||
    source.hasSignatureLikeQuery ||
    (source.hasExpiryLikeQuery && !approvedTimeWindow)
  );
}

export function isPlaybackSourceEligible(
  source: PlaybackSourcePolicyInput,
  destination: PlaybackDestination,
  now = new Date(),
) {
  const eligibleStates: readonly string[] =
    directEligibilityStatesForDestination(destination);
  if (!eligibleStates.includes(source.directEligibility)) {
    return false;
  }
  const lastSuccessAt = source.lastSuccessAt
    ? new Date(source.lastSuccessAt).getTime()
    : Number.NaN;
  if (
    !Number.isFinite(lastSuccessAt) ||
    lastSuccessAt > now.getTime() ||
    now.getTime() - lastSuccessAt > PLAYBACK_SOURCE_FRESHNESS_MS
  ) {
    return false;
  }

  const classification = classifyStreamUrl(source.url);
  if (
    !classification.valid ||
    !['http:', 'https:'].includes(classification.scheme) ||
    hasSensitiveSourceParameters(classification, source.eligibilityReason)
  ) {
    return false;
  }

  if (destination === 'web') {
    return (
      classification.scheme === 'https:' &&
      source.status === 'BROWSER_OK' &&
      source.corsAllowed &&
      !source.mixedContent
    );
  }

  return source.status === 'BROWSER_OK' || source.status === 'VLC_ONLY';
}

export function playbackOperationExpiresAt(
  now: Date,
  accessExpiresAt: string | null,
) {
  const attemptExpiry = now.getTime() + PLAYBACK_ATTEMPT_TTL_MS;
  const accessExpiry = accessExpiresAt ? new Date(accessExpiresAt).getTime() : Number.NaN;
  const expiresAt = Number.isFinite(accessExpiry)
    ? Math.min(attemptExpiry, accessExpiry)
    : attemptExpiry;
  return new Date(expiresAt);
}

export function productionPlaybackResolutionEnabled() {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.PLAYBACK_ELIGIBILITY_READY === 'true'
  );
}
