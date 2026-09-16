import assert from 'node:assert/strict';
import test from 'node:test';

import { telemetryPlayerEngineSchema } from './api-contracts';
import { assessStreamForRequalification, detectTelemetryAlerts } from './telemetry-metrics';
import { validateTelemetryTimestamp, validRequestId } from './telemetry-policy';

test('telemetry timestamps reject stale and future client dates', () => {
  const now = new Date('2026-07-22T12:00:00.000Z');
  assert.equal(validateTelemetryTimestamp('2026-07-22T11:59:00.000Z', now), null);
  assert.equal(validateTelemetryTimestamp('2026-07-14T11:59:00.000Z', now), 'EVENT_TOO_OLD');
  assert.equal(validateTelemetryTimestamp('2026-07-22T12:06:00.000Z', now), 'EVENT_IN_FUTURE');
});

test('request identifiers and player engines are bounded and canonical', () => {
  assert.equal(validRequestId('edge-01:request.42'), 'edge-01:request.42');
  assert.equal(validRequestId('bad id'), null);
  assert.equal(telemetryPlayerEngineSchema.safeParse('media_kit').success, true);
  assert.equal(telemetryPlayerEngineSchema.safeParse('flutter').success, true);
  assert.equal(telemetryPlayerEngineSchema.safeParse('browser').success, false);
  assert.equal(telemetryPlayerEngineSchema.safeParse('m3u-download').success, false);
});

test('stream requalification uses session rates and a minimum sample', () => {
  assert.equal(assessStreamForRequalification({ streamId: 'a', sessions: 4, startRate: 0, failureRate: 100, bufferingRate: 100, p95StartupMs: 20_000 }), null);
  assert.deepEqual(
    assessStreamForRequalification({ streamId: 'a', sessions: 20, startRate: 35, failureRate: 65, bufferingRate: 10, p95StartupMs: 2_000 })?.severity,
    'critical',
  );
});

test('alert detection ignores tiny samples and flags material degradation', () => {
  assert.deepEqual(
    detectTelemetryAlerts(
      { sessions: 5, startRate: 10, failureRate: 90 },
      { sessions: 5, startRate: 90, failureRate: 5 },
    ),
    [],
  );
  assert.equal(
    detectTelemetryAlerts(
      { sessions: 50, startRate: 60, failureRate: 40 },
      { sessions: 50, startRate: 90, failureRate: 10 },
    ).length,
    2,
  );
});
