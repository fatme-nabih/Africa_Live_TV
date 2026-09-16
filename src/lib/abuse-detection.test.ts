import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_ABUSE_DETECTION_THRESHOLDS,
  detectAbuse,
  retainBoundedAbuseObservations,
  type AbuseDetectionThresholds,
  type AbuseObservation,
} from './abuse-detection';

const evaluatedAtMs = Date.parse('2026-07-23T12:00:00.000Z');

function observation(
  millisecondsAgo: number,
  channelOrdinal: number | null,
  networkFingerprint = 'network-hash-a',
): AbuseObservation {
  return {
    occurredAtMs: evaluatedAtMs - millisecondsAgo,
    channelOrdinal,
    networkFingerprint,
  };
}

function thresholds(
  overrides: Partial<AbuseDetectionThresholds> = {},
): AbuseDetectionThresholds {
  return {
    ...DEFAULT_ABUSE_DETECTION_THRESHOLDS,
    ...overrides,
  };
}

test('retention is deterministic and bounded by age and count', () => {
  const configured = thresholds({
    retentionWindowMs: 1_000,
    maxRetainedObservations: 3,
    sequentialWindowMs: 1_000,
    rapidWindowMs: 1_000,
    networkRotationWindowMs: 1_000,
  });
  const retained = retainBoundedAbuseObservations(
    [
      observation(100, 5),
      observation(2_000, 1),
      observation(400, 3),
      observation(300, 4),
      observation(500, 2),
      {
        occurredAtMs: evaluatedAtMs + 1,
        channelOrdinal: 6,
        networkFingerprint: 'future-network-hash',
      },
    ],
    evaluatedAtMs,
    configured,
  );

  assert.deepEqual(
    retained.map((item) => item.channelOrdinal),
    [3, 4, 5],
  );
});

test('sequential channel access emits an alert for human review, never a suspension', () => {
  const events = Array.from({ length: 10 }, (_, index) =>
    observation((10 - index) * 2_000, index + 100),
  );

  const result = detectAbuse(events, evaluatedAtMs);

  assert.equal(result.decision, 'ALERT_REVIEW');
  assert.equal(result.requiresHumanReview, true);
  assert.deepEqual(result.signals, [
    {
      code: 'CHANNEL_ENUMERATION',
      observed: 10,
      threshold: 10,
      windowMs: 120_000,
    },
  ]);
  assert.equal(JSON.stringify(result).includes('SUSPEND'), false);
});

test('a rapid non-human cadence is detected from the median interval', () => {
  const events = Array.from({ length: 20 }, (_, index) =>
    observation((19 - index) * 200, (index * 7) % 103),
  );

  const result = detectAbuse(events, evaluatedAtMs);

  assert.deepEqual(
    result.signals.map((signal) => signal.code),
    ['NON_HUMAN_RATE'],
  );
  assert.equal(result.signals[0].observed, 200);
});

test('network rotation exposes only aggregate counts, never fingerprints', () => {
  const fingerprints = [
    'hashed-network-1',
    'hashed-network-2',
    'hashed-network-3',
    'hashed-network-4',
    'hashed-network-5',
    'hashed-network-1',
    'hashed-network-2',
    'hashed-network-3',
  ];
  const events = fingerprints.map((fingerprint, index) =>
    observation(70_000 - index * 5_000, index * 3, fingerprint),
  );

  const result = detectAbuse(events, evaluatedAtMs);
  const serialized = JSON.stringify(result);

  assert.deepEqual(result.signals, [
    {
      code: 'NETWORK_ROTATION',
      observed: 5,
      threshold: 5,
      windowMs: 600_000,
    },
  ]);
  assert.equal(result.aggregate.distinctNetworks, 5);
  for (const fingerprint of fingerprints) {
    assert.equal(serialized.includes(fingerprint), false);
  }
});

test('normal paced, non-sequential activity remains allowed', () => {
  const events = [
    observation(300_000, 8),
    observation(240_000, 42),
    observation(180_000, 3),
    observation(120_000, 95),
    observation(60_000, 12),
    observation(0, 55),
  ];

  assert.deepEqual(detectAbuse(events, evaluatedAtMs), {
    decision: 'ALLOW',
    requiresHumanReview: false,
    signals: [],
    aggregate: {
      evaluatedObservations: 6,
      distinctChannels: 6,
      distinctNetworks: 1,
    },
  });
});
