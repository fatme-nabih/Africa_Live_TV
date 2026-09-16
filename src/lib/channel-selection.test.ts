import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEnrichedChannel,
  resolveChannelAvailability,
  resolvePlaybackMode,
  selectBestStream,
  type ChannelRecord,
  type StreamRecord,
} from './channel-selection';

const baseChannel = {
  id: 'channel-1',
  name: 'News One',
  normalizedName: 'news one',
  tvgId: null,
  logoUrl: null,
  groupTitle: 'News',
  countryCode: 'SN',
  language: 'fr',
} as ChannelRecord;

function makeStream(overrides: Partial<StreamRecord>): StreamRecord {
  return {
    id: 'stream-1',
    channelId: 'channel-1',
    url: 'https://example.com/live.m3u8',
    status: 'UNTESTED',
    corsAllowed: false,
    mixedContent: false,
    httpStatus: null,
    lastCheckedAt: null,
    failureReason: null,
    verificationState: 'NEVER_CHECKED',
    lastSuccessAt: null,
    directEligibility: 'REVIEW_REQUIRED',
    eligibilityReason: 'NOT_REVALIDATED',
    eligibilityCheckedAt: null,
    ...overrides,
  } as StreamRecord;
}

test('selectBestStream prefers browser-ready streams', () => {
  const streams = [
    makeStream({
      id: 'stream-2',
      status: 'VLC_ONLY',
      directEligibility: 'PUBLIC_DIRECT_VLC',
      corsAllowed: true,
      mixedContent: false,
    }),
    makeStream({
      id: 'stream-1',
      status: 'BROWSER_OK',
      directEligibility: 'PUBLIC_DIRECT_WEB',
      corsAllowed: true,
      mixedContent: false,
      httpStatus: 200,
    }),
    makeStream({
      id: 'stream-3',
      status: 'OFFLINE',
      directEligibility: 'OFFLINE',
      corsAllowed: false,
      mixedContent: true,
    }),
  ];

  const best = selectBestStream(streams);

  assert.ok(best);
  assert.equal(best?.id, 'stream-1');

  const enriched = buildEnrichedChannel(baseChannel, streams);
  assert.equal(enriched.playbackMode, 'BROWSER');
  assert.equal(enriched.streams[0].id, 'stream-1');
});

test('resolvePlaybackMode falls back to external and unverified modes', () => {
  const externalOnly = [
    makeStream({
      status: 'VLC_ONLY',
      directEligibility: 'PUBLIC_DIRECT_VLC',
      corsAllowed: true,
      mixedContent: false,
    }),
  ];
  const unverifiedOnly = [
    makeStream({
      status: 'UNTESTED',
      directEligibility: 'REVIEW_REQUIRED',
      corsAllowed: false,
      mixedContent: false,
    }),
  ];

  assert.equal(resolvePlaybackMode(externalOnly), 'EXTERNAL');
  assert.equal(resolvePlaybackMode(unverifiedOnly), 'UNVERIFIED');
});

test('channel availability distinguishes grace, review and confirmed outage', () => {
  const cutoff = new Date('2026-07-24T09:00:00.000Z');
  const freshSuccess = '2026-07-24T10:00:00.000Z';

  assert.equal(
    resolveChannelAvailability([
      makeStream({
        status: 'BROWSER_OK',
        verificationState: 'HEALTHY',
        directEligibility: 'PUBLIC_DIRECT_WEB',
        lastSuccessAt: freshSuccess,
      }),
    ], cutoff),
    'READY',
  );
  assert.equal(
    resolveChannelAvailability([
      makeStream({
        status: 'BROWSER_OK',
        verificationState: 'TEMPORARY_FAILURE',
        directEligibility: 'PUBLIC_DIRECT_WEB',
        lastSuccessAt: freshSuccess,
      }),
    ], cutoff),
    'TEMPORARY_FAILURE',
  );
  assert.equal(
    resolveChannelAvailability([
      makeStream({
        verificationState: 'STALE',
        directEligibility: 'REVIEW_REQUIRED',
      }),
    ], cutoff),
    'REVIEW_REQUIRED',
  );
  assert.equal(
    resolveChannelAvailability([
      makeStream({
        status: 'OFFLINE',
        verificationState: 'CONFIRMED_FAILURE',
        directEligibility: 'OFFLINE',
      }),
    ], cutoff),
    'OFFLINE',
  );
});
