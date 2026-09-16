import { eq } from 'drizzle-orm';

import { db, pool } from '../db';
import { streams } from '../db/schema';
import { classifyStreamUrl } from '../lib/secure-media-assessment';
import { STREAM_FRESHNESS_TTL_MS } from '../lib/stream-freshness';

function increment(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1;
}

async function run() {
  const generatedAt = new Date();
  const rows = await db
    .select({
      url: streams.url,
      status: streams.status,
      verificationState: streams.verificationState,
      failureReason: streams.failureReason,
      directEligibility: streams.directEligibility,
      eligibilityReason: streams.eligibilityReason,
      lastSuccessAt: streams.lastSuccessAt,
    })
    .from(streams)
    .where(eq(streams.active, true));

  const states: Record<string, number> = {
    PUBLIC_DIRECT_WEB: 0,
    PUBLIC_DIRECT_VLC: 0,
    REVIEW_REQUIRED: 0,
    OFFLINE: 0,
  };
  const technicalStatuses: Record<string, number> = {
    BROWSER_OK: 0,
    VLC_ONLY: 0,
    OFFLINE: 0,
    UNTESTED: 0,
  };
  const verificationStates: Record<string, number> = {
    HEALTHY: 0,
    STALE: 0,
    TEMPORARY_FAILURE: 0,
    CONFIRMED_FAILURE: 0,
    NEVER_CHECKED: 0,
  };
  const failureReasons: Record<string, number> = {};
  const reasons: Record<string, number> = {};
  const reviewSignals = {
    query: 0,
    embeddedCredentials: 0,
    authLike: 0,
    expiryLike: 0,
    signatureLike: 0,
    reviewableTimeWindow: 0,
  };
  const historicallyPlayableReviewSignals = {
    query: 0,
    embeddedCredentials: 0,
    authLike: 0,
    expiryLike: 0,
    signatureLike: 0,
    reviewableTimeWindow: 0,
    staleSuccess: 0,
  };
  let historicallyPlayable = 0;

  for (const row of rows) {
    increment(technicalStatuses, row.status);
    increment(verificationStates, row.verificationState);
    if (row.failureReason) {
      const safeFailureReason = /^[A-Z][A-Z0-9_]{0,99}$/.test(row.failureReason)
        ? row.failureReason
        : 'REDACTED_FAILURE';
      increment(failureReasons, safeFailureReason);
    }
    increment(states, row.directEligibility);
    increment(reasons, row.eligibilityReason);
    const isHistoricallyPlayable =
      row.status === 'BROWSER_OK' || row.status === 'VLC_ONLY';
    if (isHistoricallyPlayable) {
      historicallyPlayable += 1;
    }

    const classification = classifyStreamUrl(row.url);
    if (classification.hasQuery) reviewSignals.query += 1;
    if (classification.hasEmbeddedCredentials) reviewSignals.embeddedCredentials += 1;
    if (classification.hasAuthLikeQuery) reviewSignals.authLike += 1;
    if (classification.hasExpiryLikeQuery) reviewSignals.expiryLike += 1;
    if (classification.hasSignatureLikeQuery) reviewSignals.signatureLike += 1;
    if (classification.hasReviewableTimeWindowQuery) {
      reviewSignals.reviewableTimeWindow += 1;
    }
    if (isHistoricallyPlayable) {
      if (classification.hasQuery) historicallyPlayableReviewSignals.query += 1;
      if (classification.hasEmbeddedCredentials) {
        historicallyPlayableReviewSignals.embeddedCredentials += 1;
      }
      if (classification.hasAuthLikeQuery) {
        historicallyPlayableReviewSignals.authLike += 1;
      }
      if (classification.hasExpiryLikeQuery) {
        historicallyPlayableReviewSignals.expiryLike += 1;
      }
      if (classification.hasSignatureLikeQuery) {
        historicallyPlayableReviewSignals.signatureLike += 1;
      }
      if (classification.hasReviewableTimeWindowQuery) {
        historicallyPlayableReviewSignals.reviewableTimeWindow += 1;
      }
    }
    if (
      isHistoricallyPlayable &&
      (
        row.lastSuccessAt == null ||
        generatedAt.getTime() - new Date(row.lastSuccessAt).getTime() >
          STREAM_FRESHNESS_TTL_MS
      )
    ) {
      historicallyPlayableReviewSignals.staleSuccess += 1;
    }
  }

  console.log(JSON.stringify({
    generatedAt: generatedAt.toISOString(),
    totalActive: rows.length,
    historicallyPlayable,
    technicalStatuses,
    verificationStates,
    failureReasons,
    directEligibility: states,
    eligibilityReasons: reasons,
    reviewSignals,
    historicallyPlayableReviewSignals,
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(JSON.stringify({
      level: 'error',
      event: 'direct_eligibility_report_failed',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
