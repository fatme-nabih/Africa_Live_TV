import assert from 'node:assert/strict';
import test from 'node:test';

import {
  failedVerificationTransition,
  PERSISTENT_FAILURE_CONFIRMATION_THRESHOLD,
  STREAM_FAILURE_CONFIRMATION_INTERVAL_MS,
  TEMPORARY_FAILURE_CONFIRMATION_THRESHOLD,
} from './stream-verification-policy';

const now = new Date('2026-07-24T12:00:00.000Z');
const freshnessTtlMs = 72 * 60 * 60 * 1_000;

function transition(
  overrides: Partial<Parameters<typeof failedVerificationTransition>[0]> = {},
) {
  return failedVerificationTransition({
    now,
    temporaryFailure: false,
    status: 'BROWSER_OK',
    verificationState: 'HEALTHY',
    directEligibility: 'PUBLIC_DIRECT_WEB',
    consecutiveFailures: 0,
    lastCheckedAt: new Date(now.getTime() - 60 * 60 * 1_000).toISOString(),
    lastSuccessAt: new Date(now.getTime() - 60 * 60 * 1_000).toISOString(),
    freshnessTtlMs,
    ...overrides,
  });
}

test('a first failed probe retains a recent known-good direct source', () => {
  assert.deepEqual(
    transition(),
    {
      failures: 1,
      confirmed: false,
      previousFailureIsTooRecent: false,
      recentSuccess: true,
      retainLastKnownGood: true,
    },
  );
});

test('repeated scans inside the confirmation interval cannot inflate failures', () => {
  const result = transition({
    verificationState: 'TEMPORARY_FAILURE',
    consecutiveFailures: 1,
    lastCheckedAt: new Date(
      now.getTime() - STREAM_FAILURE_CONFIRMATION_INTERVAL_MS + 1,
    ).toISOString(),
  });

  assert.equal(result.failures, 1);
  assert.equal(result.previousFailureIsTooRecent, true);
  assert.equal(result.confirmed, false);
  assert.equal(result.retainLastKnownGood, true);
});

test('persistent and temporary failures require their spaced thresholds', () => {
  const persistent = transition({
    consecutiveFailures: PERSISTENT_FAILURE_CONFIRMATION_THRESHOLD - 1,
    verificationState: 'TEMPORARY_FAILURE',
    lastCheckedAt: new Date(
      now.getTime() - STREAM_FAILURE_CONFIRMATION_INTERVAL_MS,
    ).toISOString(),
  });
  assert.equal(persistent.failures, PERSISTENT_FAILURE_CONFIRMATION_THRESHOLD);
  assert.equal(persistent.confirmed, true);
  assert.equal(persistent.retainLastKnownGood, false);

  const temporary = transition({
    temporaryFailure: true,
    consecutiveFailures: TEMPORARY_FAILURE_CONFIRMATION_THRESHOLD - 1,
    verificationState: 'TEMPORARY_FAILURE',
    lastCheckedAt: new Date(
      now.getTime() - STREAM_FAILURE_CONFIRMATION_INTERVAL_MS,
    ).toISOString(),
  });
  assert.equal(temporary.failures, TEMPORARY_FAILURE_CONFIRMATION_THRESHOLD);
  assert.equal(temporary.confirmed, true);
});

test('an expired success or a review-only source is never retained', () => {
  assert.equal(
    transition({
      lastSuccessAt: new Date(now.getTime() - freshnessTtlMs - 1).toISOString(),
    }).retainLastKnownGood,
    false,
  );
  assert.equal(
    transition({ directEligibility: 'REVIEW_REQUIRED' }).retainLastKnownGood,
    false,
  );
});
