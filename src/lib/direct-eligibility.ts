import { classifyStreamUrl } from './secure-media-assessment';

export const DIRECT_ELIGIBILITY_STATES = [
  'PUBLIC_DIRECT_WEB',
  'PUBLIC_DIRECT_VLC',
  'REVIEW_REQUIRED',
  'OFFLINE',
] as const;

export type DirectEligibility = (typeof DIRECT_ELIGIBILITY_STATES)[number];

export type DirectEligibilityDecision = {
  state: DirectEligibility;
  reason: string;
};

export function classifyStaticDirectEligibility(
  rawUrl: string,
): DirectEligibilityDecision | null {
  const source = classifyStreamUrl(rawUrl);
  if (!source.valid || !['http:', 'https:'].includes(source.scheme)) {
    return { state: 'REVIEW_REQUIRED', reason: 'UNSUPPORTED_SOURCE_URL' };
  }
  if (source.hasEmbeddedCredentials) {
    return { state: 'REVIEW_REQUIRED', reason: 'EMBEDDED_CREDENTIALS' };
  }
  if (source.hasAuthLikeQuery || source.hasSignatureLikeQuery) {
    return { state: 'REVIEW_REQUIRED', reason: 'SENSITIVE_QUERY' };
  }
  if (source.hasExpiryLikeQuery) {
    return source.hasReviewableTimeWindowQuery
      ? {
          state: 'REVIEW_REQUIRED',
          reason: 'TIME_WINDOW_QUERY_REQUIRES_REVIEW',
        }
      : { state: 'REVIEW_REQUIRED', reason: 'SENSITIVE_QUERY' };
  }
  if (source.hasQuery) {
    return { state: 'REVIEW_REQUIRED', reason: 'QUERY_REQUIRES_REVIEW' };
  }
  return null;
}

export function decideDirectEligibility({
  url,
  available,
  playableStatus,
  setsCookie,
  confirmedOffline,
  reviewedQuery = null,
}: {
  url: string;
  available: boolean;
  playableStatus: 'BROWSER_OK' | 'VLC_ONLY' | null;
  setsCookie: boolean;
  confirmedOffline: boolean;
  reviewedQuery?: 'generic' | 'time-window' | null;
}): DirectEligibilityDecision {
  const staticDecision = classifyStaticDirectEligibility(url);
  const approvedGenericQuery =
    reviewedQuery === 'generic' &&
    staticDecision?.reason === 'QUERY_REQUIRES_REVIEW';
  const approvedTimeWindowQuery =
    reviewedQuery === 'time-window' &&
    staticDecision?.reason === 'TIME_WINDOW_QUERY_REQUIRES_REVIEW';
  if (staticDecision && !approvedGenericQuery && !approvedTimeWindowQuery) {
    return staticDecision;
  }
  const reviewedSuffix = approvedTimeWindowQuery
    ? 'TIME_WINDOW_REVIEWED'
    : approvedGenericQuery
      ? 'QUERY_REVIEWED'
      : null;
  if (setsCookie && (!available || !playableStatus)) {
    return {
      state: 'REVIEW_REQUIRED',
      reason: reviewedSuffix
        ? `${reviewedSuffix}_COOKIE_OBSERVED`
        : 'COOKIE_OBSERVED',
    };
  }
  if (!available || !playableStatus) {
    return confirmedOffline
      ? {
          state: 'OFFLINE',
          reason: reviewedSuffix
            ? `${reviewedSuffix}_CONFIRMED_OFFLINE`
            : 'CONFIRMED_OFFLINE',
        }
      : {
          state: 'REVIEW_REQUIRED',
          reason: reviewedSuffix
            ? `${reviewedSuffix}_VERIFICATION_FAILED`
            : 'VERIFICATION_FAILED',
        };
  }
  if (playableStatus === 'BROWSER_OK') {
    return {
      state: 'PUBLIC_DIRECT_WEB',
      reason: reviewedSuffix
        ? `FRESH_BROWSER_${reviewedSuffix}`
        : 'FRESH_BROWSER_CHECK',
    };
  }
  return {
    state: 'PUBLIC_DIRECT_VLC',
    reason: reviewedSuffix
      ? `FRESH_VLC_${reviewedSuffix}`
      : 'FRESH_VLC_CHECK',
  };
}

export function directEligibilityStatesForDestination(
  destination: 'web' | 'vlc-mobile' | 'vlc-local',
) {
  return destination === 'web'
    ? ['PUBLIC_DIRECT_WEB'] as const
    : ['PUBLIC_DIRECT_WEB', 'PUBLIC_DIRECT_VLC'] as const;
}
