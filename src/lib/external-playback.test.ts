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

test('iOS receives one complete URL, including signed query parameters and fragments', () => {
  const streamUrl = 'http://media.test:8080/a%20b/live.m3u8?token=a%2Fb%3D%3D&next=x%26y&empty=&x-success=upstream#video';
  const link = new URL(buildMobileVlcUrl(streamUrl, 'ios'));
  assert.equal(link.protocol, 'vlc-x-callback:');
  assert.equal(link.hostname, 'x-callback-url');
  assert.equal(link.pathname, '/stream');
  assert.deepEqual([...link.searchParams], [['url', streamUrl]]);
  assert.equal(link.hash, '');
});

test('iPadOS desktop user agents still use the iOS VLC link', () => {
  const desktopAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15';
  assert.equal(detectMobilePlatform(desktopAgent, 5), 'ios');
  assert.equal(detectMobilePlatform(desktopAgent, 0), null);
  assert.equal(detectMobilePlatform('Mozilla iPad'), 'ios');
});

test('mobile VLC links reject non-HTTP media on both platforms', () => {
  for (const platform of ['ios', 'android'] as const) {
    for (const url of ['javascript:alert(1)', 'file:///private/video.mp4', 'not-a-url']) {
      assert.throws(() => buildMobileVlcUrl(url, platform));
    }
  }
});
