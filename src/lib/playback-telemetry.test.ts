import assert from 'node:assert/strict';
import test from 'node:test';

import type { PlaybackEventPayload } from './playback-events-client';
import { PlaybackAttemptTelemetry } from './playback-telemetry';

test('opened, started, stopped and failures are unique per attempt', () => {
  const events: PlaybackEventPayload[] = [];
  const telemetry = new PlaybackAttemptTelemetry((event) => events.push(event));
  const attempt = {
    playbackSessionId: 'session',
    attemptId: 'attempt',
    channelId: 'channel',
  };

  telemetry.emit(attempt, 'opened');
  telemetry.emit(attempt, 'opened');
  telemetry.emit(attempt, 'started');
  telemetry.emit(attempt, 'started');
  telemetry.emit(attempt, 'failed', { errorCode: 'NETWORK' });
  telemetry.emit(attempt, 'failed', { errorCode: 'NETWORK' });
  telemetry.emit(attempt, 'stopped');
  telemetry.emit(attempt, 'stopped');

  assert.deepEqual(events.map((event) => event.event), ['opened', 'started', 'failed', 'stopped']);
});
