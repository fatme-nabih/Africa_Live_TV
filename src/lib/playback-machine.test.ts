import assert from 'node:assert/strict';
import test from 'node:test';

import { initialPlaybackState, playbackReducer } from './playback-machine';

const source = {
  url: 'https://one.test/live.m3u8',
};

test('a failed source is exhausted without using a client-side candidate list', () => {
  let state = playbackReducer(initialPlaybackState, { type: 'SELECT_CHANNEL', channelId: 'channel' });
  state = playbackReducer(state, { type: 'RESOLVED', source, attemptId: 'attempt-one' });
  assert.equal(state.engine, 'browser');
  state = playbackReducer(state, { type: 'ENGINE_SELECTED', engine: 'hls.js' });
  assert.equal(state.engine, 'hls.js');
  state = playbackReducer(state, {
    type: 'STREAM_FAILED',
    failure: { category: 'network', code: 'NETWORK', message: 'offline' },
  });
  assert.equal(state.phase, 'exhausted');
  assert.equal(state.source?.url, source.url);
  assert.equal(state.attemptId, 'attempt-one');
});

test('autoplay rejection waits for user action and never requests VLC', () => {
  let state = playbackReducer(initialPlaybackState, { type: 'SELECT_CHANNEL', channelId: 'channel' });
  state = playbackReducer(state, { type: 'RESOLVED', source, attemptId: 'attempt-one' });
  state = playbackReducer(state, {
    type: 'AUTOPLAY_BLOCKED',
    failure: { category: 'autoplay', code: 'AUTOPLAY_BLOCKED', message: 'click' },
  });
  assert.equal(state.phase, 'awaiting-user');
  assert.equal(
    playbackReducer(state, { type: 'EXTERNAL_REQUESTED', userInitiated: false }).phase,
    'awaiting-user',
  );
  assert.equal(
    playbackReducer(state, { type: 'EXTERNAL_REQUESTED', userInitiated: true }).phase,
    'external-opening',
  );
});

test('an external-only result waits for an explicit external-player action', () => {
  let state = playbackReducer(initialPlaybackState, { type: 'SELECT_CHANNEL', channelId: 'channel' });
  state = playbackReducer(state, { type: 'EXTERNAL_REQUIRED' });
  assert.equal(state.phase, 'external-required');
  assert.equal(state.engine, null);
  assert.equal(
    playbackReducer(state, { type: 'EXTERNAL_REQUESTED', userInitiated: true }).phase,
    'external-opening',
  );
});

test('mobile VLC waits for a second gesture after asynchronous resolution', () => {
  let state = playbackReducer(initialPlaybackState, {
    type: 'SELECT_CHANNEL',
    channelId: 'channel',
  });
  state = playbackReducer(state, { type: 'EXTERNAL_REQUIRED' });
  state = playbackReducer(state, {
    type: 'EXTERNAL_REQUESTED',
    userInitiated: true,
  });
  assert.equal(state.phase, 'external-opening');
  state = playbackReducer(state, { type: 'EXTERNAL_READY' });
  assert.equal(state.phase, 'external-ready');
  state = playbackReducer(state, { type: 'EXTERNAL_OPENED' });
  assert.equal(state.phase, 'external-opened');
});
