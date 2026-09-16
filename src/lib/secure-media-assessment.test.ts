import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyStreamUrl,
  containsSourceExposure,
  estimateMonthlyEgressGiB,
  parseHlsManifestMetrics,
  providerFingerprint,
} from './secure-media-assessment';

test('stream classification reports protocol and credential signals without returning a hostname', () => {
  const result = classifyStreamUrl(
    'https://user:password@media.example/live/master.m3u8?token=secret&expires=123&sig=value',
  );

  assert.equal(result.valid, true);
  assert.equal(result.scheme, 'https:');
  assert.equal(result.protocolHint, 'hls');
  assert.equal(result.providerId, providerFingerprint('media.example'));
  assert.notEqual(result.providerId, 'media.example');
  assert.equal(result.hasEmbeddedCredentials, true);
  assert.equal(result.hasAuthLikeQuery, true);
  assert.equal(result.hasExpiryLikeQuery, true);
  assert.equal(result.hasSignatureLikeQuery, true);
});

test('HLS metrics cover master bandwidths, resource attributes and segment durations', () => {
  const master = [
    '#EXTM3U',
    '#EXT-X-MEDIA:TYPE=AUDIO,URI="audio/index.m3u8"',
    '#EXT-X-STREAM-INF:BANDWIDTH=2500000',
    'video/index.m3u8',
  ].join('\n');
  const media = [
    '#EXTM3U',
    '#EXT-X-KEY:METHOD=AES-128,URI="key.bin"',
    '#EXTINF:4.5,',
    'one.ts',
    '#EXTINF:5,',
    'two.ts',
  ].join('\n');

  assert.deepEqual(parseHlsManifestMetrics(master), {
    isHls: true,
    isMaster: true,
    byteLength: Buffer.byteLength(master),
    resourceReferences: 2,
    declaredBandwidths: [2_500_000],
    segmentDurationsSeconds: [],
  });
  assert.deepEqual(parseHlsManifestMetrics(media).segmentDurationsSeconds, [4.5, 5]);
  assert.equal(parseHlsManifestMetrics(media).resourceReferences, 3);
});

test('source exposure and egress estimation remain deterministic', () => {
  const source = 'https://media.example/live/master.m3u8';
  assert.equal(containsSourceExposure(`/relay?id=opaque`, source, 'media.example'), false);
  assert.equal(containsSourceExposure(`URI="${source}"`, source, 'media.example'), true);

  const gib = estimateMonthlyEgressGiB({
    concurrentStreams: 1,
    averageBitrateMbps: 1,
    activeHoursPerDay: 24,
  });
  assert.ok(gib > 300 && gib < 302);
});
