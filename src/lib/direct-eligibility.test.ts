import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyStaticDirectEligibility,
  decideDirectEligibility,
  directEligibilityStatesForDestination,
} from './direct-eligibility';

test('sensitive and credentialed URLs always require review', () => {
  assert.equal(
    classifyStaticDirectEligibility('https://user:password@media.test/live.m3u8')
      ?.reason,
    'EMBEDDED_CREDENTIALS',
  );
  assert.equal(
    classifyStaticDirectEligibility('https://media.test/live.m3u8?token=secret')
      ?.reason,
    'SENSITIVE_QUERY',
  );
  assert.equal(
    classifyStaticDirectEligibility('https://media.test/live.m3u8?quality=auto')
      ?.reason,
    'QUERY_REQUIRES_REVIEW',
  );
  assert.equal(
    classifyStaticDirectEligibility(
      'https://media.test/live.m3u8?start=100&end=200',
    )?.reason,
    'TIME_WINDOW_QUERY_REQUIRES_REVIEW',
  );
  assert.equal(
    classifyStaticDirectEligibility(
      'https://media.test/live.m3u8?expires=200',
    )?.reason,
    'SENSITIVE_QUERY',
  );
});

test('fresh technical checks map to explicit direct eligibility', () => {
  assert.deepEqual(
    decideDirectEligibility({
      url: 'https://media.test/live.m3u8',
      available: true,
      playableStatus: 'BROWSER_OK',
      setsCookie: false,
      confirmedOffline: false,
    }),
    { state: 'PUBLIC_DIRECT_WEB', reason: 'FRESH_BROWSER_CHECK' },
  );
  assert.equal(
    decideDirectEligibility({
      url: 'http://media.test/live.m3u8',
      available: true,
      playableStatus: 'VLC_ONLY',
      setsCookie: false,
      confirmedOffline: false,
    }).state,
    'PUBLIC_DIRECT_VLC',
  );
  assert.deepEqual(
    decideDirectEligibility({
      url: 'https://media.test/live.m3u8',
      available: true,
      playableStatus: 'BROWSER_OK',
      setsCookie: true,
      confirmedOffline: false,
    }),
    { state: 'PUBLIC_DIRECT_WEB', reason: 'FRESH_BROWSER_CHECK' },
  );
});

test('a cookie observed on a successful cookie-free probe is not treated as required', () => {
  assert.equal(
    decideDirectEligibility({
      url: 'https://media.test/live.m3u8',
      available: false,
      playableStatus: null,
      setsCookie: true,
      confirmedOffline: false,
    }).reason,
    'COOKIE_OBSERVED',
  );
  assert.deepEqual(
    decideDirectEligibility({
      url: 'https://media.test/live.m3u8?quality=auto',
      available: true,
      playableStatus: 'VLC_ONLY',
      setsCookie: false,
      confirmedOffline: false,
      reviewedQuery: 'generic',
    }),
    {
      state: 'PUBLIC_DIRECT_VLC',
      reason: 'FRESH_VLC_QUERY_REVIEWED',
    },
  );
  assert.deepEqual(
    decideDirectEligibility({
      url: 'https://media.test/live.m3u8?start=100&end=200',
      available: true,
      playableStatus: 'BROWSER_OK',
      setsCookie: false,
      confirmedOffline: false,
      reviewedQuery: 'time-window',
    }),
    {
      state: 'PUBLIC_DIRECT_WEB',
      reason: 'FRESH_BROWSER_TIME_WINDOW_REVIEWED',
    },
  );
});

test('web and VLC destinations accept only their explicit states', () => {
  assert.deepEqual(directEligibilityStatesForDestination('web'), [
    'PUBLIC_DIRECT_WEB',
  ]);
  assert.deepEqual(directEligibilityStatesForDestination('vlc-mobile'), [
    'PUBLIC_DIRECT_WEB',
    'PUBLIC_DIRECT_VLC',
  ]);
});
