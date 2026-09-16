import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMobileVlcUrl,
  detectMobilePlatform,
} from './external-playback';

test('mobile VLC links preserve the complete stream URL', () => {
  const streamUrl = 'https://media.test/live/index.m3u8?token=a%20b&quality=hd';
  const android = buildMobileVlcUrl(streamUrl, 'android');
  const ios = buildMobileVlcUrl(streamUrl, 'ios');
  assert.match(android, /^intent:\/\/media\.test\/live\/index\.m3u8\?token=a%20b&quality=hd#Intent;/);
  assert.equal(ios, `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(streamUrl)}`);
  assert.equal(detectMobilePlatform('Mozilla Android 14'), 'android');
  assert.equal(detectMobilePlatform('Mozilla iPhone'), 'ios');
});
