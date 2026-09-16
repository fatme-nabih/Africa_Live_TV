import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PLAYER_WINDOW_FEATURES,
  PLAYER_WINDOW_NAME,
  buildPlayerPath,
  isMobilePlayerDevice,
  launchPlayer,
} from './player-window';

test('player paths contain only the encoded channel identifier', () => {
  assert.equal(buildPlayerPath('channel 1'), '/player/channel%201');
  assert.equal(buildPlayerPath('channel?token=secret'), '/player/channel%3Ftoken%3Dsecret');
});

test('desktop launches and focuses the unique named player window', () => {
  let focused = 0;
  let invocation: string[] = [];
  const handle = { closed: false, focus: () => { focused += 1; } };
  const result = launchPlayer({
    channelId: 'channel-1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    openWindow: (url, target, features) => {
      invocation = [url, target, features];
      return handle;
    },
    navigateCurrentTab: () => assert.fail('desktop must not replace the catalogue'),
  });

  assert.equal(result.mode, 'separate-window');
  assert.deepEqual(invocation, ['/player/channel-1', PLAYER_WINDOW_NAME, PLAYER_WINDOW_FEATURES]);
  assert.equal(focused, 1);
});

test('blocked popup is reported without navigating the catalogue', () => {
  const result = launchPlayer({
    channelId: 'channel-1',
    userAgent: 'Desktop',
    openWindow: () => null,
    navigateCurrentTab: () => assert.fail('blocked desktop popup must remain recoverable'),
  });
  assert.equal(result.mode, 'blocked');

  const thrownResult = launchPlayer({
    channelId: 'channel-1',
    userAgent: 'Desktop',
    openWindow: () => { throw new Error('popup denied'); },
    navigateCurrentTab: () => assert.fail('failed desktop popup must remain recoverable'),
  });
  assert.equal(thrownResult.mode, 'blocked');
});

test('mobile and touch iPad navigation stays in the current tab', () => {
  assert.equal(isMobilePlayerDevice('Mozilla/5.0 (Linux; Android 15)'), true);
  assert.equal(isMobilePlayerDevice('Desktop Safari', 'MacIntel', 5), true);
  let navigatedTo = '';
  const result = launchPlayer({
    channelId: 'mobile-channel',
    userAgent: 'Mozilla/5.0 (iPhone)',
    openWindow: () => assert.fail('mobile must not request a popup'),
    navigateCurrentTab: (url) => { navigatedTo = url; },
  });
  assert.equal(result.mode, 'same-tab');
  assert.equal(navigatedTo, '/player/mobile-channel');
});
