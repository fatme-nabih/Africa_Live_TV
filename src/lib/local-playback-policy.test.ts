import assert from 'node:assert/strict';
import test from 'node:test';
import { isLocalPlaybackCandidate } from './local-playback-policy';

test('local playback can retry old failures and URLs with query parameters', () => {
  assert.equal(isLocalPlaybackCandidate({ url: 'https://example.test/live.m3u8?token=example', status: 'OFFLINE', corsAllowed: false }, 'web'), true);
  assert.equal(isLocalPlaybackCandidate({ url: 'http://example.test/live.m3u8', status: 'VLC_ONLY', corsAllowed: true }, 'web'), true);
  assert.equal(isLocalPlaybackCandidate({ url: 'https://example.test/live.m3u8', status: 'VLC_ONLY', corsAllowed: false }, 'web'), false);
  assert.equal(isLocalPlaybackCandidate({ url: 'https://example.test/live.m3u8', status: 'VLC_ONLY', corsAllowed: false }, 'vlc-local'), true);
});

test('VLC accepts network transports, not local files or executable arguments', () => {
  const source = { status: 'UNTESTED', corsAllowed: false };
  assert.equal(isLocalPlaybackCandidate({ ...source, url: 'udp://@239.1.1.1:1234' }, 'vlc-local'), true);
  assert.equal(isLocalPlaybackCandidate({ ...source, url: 'rtsp://example.test/live' }, 'vlc-local'), true);
  assert.equal(isLocalPlaybackCandidate({ ...source, url: 'file:///C:/private.txt' }, 'vlc-local'), false);
  assert.equal(isLocalPlaybackCandidate({ ...source, url: '--extraintf=http' }, 'vlc-local'), false);
});
