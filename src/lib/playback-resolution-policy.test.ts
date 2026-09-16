import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isPlaybackSourceEligible,
  playbackOperationExpiresAt,
  PLAYBACK_ATTEMPT_TTL_MS,
  PLAYBACK_SOURCE_FRESHNESS_MS,
  productionPlaybackResolutionEnabled,
} from './playback-resolution-policy';
import {
  STREAM_FRESHNESS_TTL_HOURS,
  STREAM_FRESHNESS_TTL_MS,
} from './stream-freshness';

const now = new Date('2026-07-23T12:00:00.000Z');

function source(overrides: Partial<Parameters<typeof isPlaybackSourceEligible>[0]> = {}) {
  return {
    url: 'https://media.test/live.m3u8',
    status: 'BROWSER_OK',
    corsAllowed: true,
    mixedContent: false,
    lastSuccessAt: new Date(now.getTime() - 60_000).toISOString(),
    directEligibility: 'PUBLIC_DIRECT_WEB',
    eligibilityReason: 'FRESH_BROWSER_CHECK',
    ...overrides,
  };
}

test('web resolution accepts only fresh HTTPS browser-compatible sources', () => {
  assert.equal(isPlaybackSourceEligible(source(), 'web', now), true);
  assert.equal(
    isPlaybackSourceEligible(source({ url: 'http://media.test/live.m3u8' }), 'web', now),
    false,
  );
  assert.equal(
    isPlaybackSourceEligible(source({ status: 'VLC_ONLY' }), 'web', now),
    false,
  );
  assert.equal(
    isPlaybackSourceEligible(source({
      directEligibility: 'REVIEW_REQUIRED',
    }), 'web', now),
    false,
  );
  assert.equal(
    isPlaybackSourceEligible(source({ corsAllowed: false }), 'web', now),
    false,
  );
  assert.equal(
    isPlaybackSourceEligible(source({ mixedContent: true }), 'web', now),
    false,
  );
});

test('resolution rejects stale, credentialed and sensitive-query sources', () => {
  assert.equal(
    isPlaybackSourceEligible(source({
      lastSuccessAt: new Date(
        now.getTime() - PLAYBACK_SOURCE_FRESHNESS_MS - 1,
      ).toISOString(),
    }), 'vlc-mobile', now),
    false,
  );
  assert.equal(
    isPlaybackSourceEligible(source({
      url: 'https://user:password@media.test/live.m3u8',
    }), 'vlc-mobile', now),
    false,
  );
  assert.equal(
    isPlaybackSourceEligible(source({
      url: 'https://media.test/live.m3u8?token=secret',
    }), 'vlc-mobile', now),
    false,
  );
});

test('verification and playback freshness remain aligned on 72 hours', () => {
  assert.equal(STREAM_FRESHNESS_TTL_HOURS, 72);
  assert.equal(PLAYBACK_SOURCE_FRESHNESS_MS, STREAM_FRESHNESS_TTL_MS);
  assert.equal(
    isPlaybackSourceEligible(source({
      lastSuccessAt: new Date(
        now.getTime() - STREAM_FRESHNESS_TTL_MS,
      ).toISOString(),
    }), 'vlc-mobile', now),
    true,
  );
  assert.equal(
    isPlaybackSourceEligible(source({
      lastSuccessAt: new Date(
        now.getTime() - STREAM_FRESHNESS_TTL_MS - 1,
      ).toISOString(),
    }), 'vlc-mobile', now),
    false,
  );
  assert.equal(
    isPlaybackSourceEligible(source({
      url: 'https://media.test/live.m3u8?start=100&end=200',
      eligibilityReason: 'FRESH_BROWSER_TIME_WINDOW_REVIEWED',
    }), 'web', now),
    true,
  );
  assert.equal(
    isPlaybackSourceEligible(source({
      url: 'https://media.test/live.m3u8?start=100&end=200',
      eligibilityReason: 'TIME_WINDOW_QUERY_REQUIRES_REVIEW',
    }), 'web', now),
    false,
  );
});

test('operation expiry is bounded by both session TTL and access expiry', () => {
  assert.equal(
    playbackOperationExpiresAt(now, null).getTime(),
    now.getTime() + PLAYBACK_ATTEMPT_TTL_MS,
  );
  const accessExpiry = new Date(now.getTime() + 60_000).toISOString();
  assert.equal(
    playbackOperationExpiresAt(now, accessExpiry).toISOString(),
    accessExpiry,
  );
});

test('production resolution remains gated until catalogue eligibility is approved', () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const previousNodeEnv = mutableEnv.NODE_ENV;
  const previousGate = mutableEnv.PLAYBACK_ELIGIBILITY_READY;

  try {
    mutableEnv.NODE_ENV = 'production';
    delete mutableEnv.PLAYBACK_ELIGIBILITY_READY;
    assert.equal(productionPlaybackResolutionEnabled(), false);

    mutableEnv.PLAYBACK_ELIGIBILITY_READY = 'false';
    assert.equal(productionPlaybackResolutionEnabled(), false);

    mutableEnv.PLAYBACK_ELIGIBILITY_READY = 'true';
    assert.equal(productionPlaybackResolutionEnabled(), true);
  } finally {
    if (previousNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = previousNodeEnv;
    if (previousGate === undefined) delete mutableEnv.PLAYBACK_ELIGIBILITY_READY;
    else mutableEnv.PLAYBACK_ELIGIBILITY_READY = previousGate;
  }
});
