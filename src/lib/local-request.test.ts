import assert from 'node:assert/strict';
import test from 'node:test';

import { isLoopbackAddress, isTrustedLocalRequest } from './local-request';

function request(headers: Record<string, string> = {}, url = 'http://localhost:3000/api/open-vlc') {
  return new Request(url, { method: 'POST', headers: { origin: 'http://localhost:3000', ...headers } });
}

test('loopback validation accepts the full IPv4 range and IPv6 loopback', () => {
  assert.equal(isLoopbackAddress('127.0.0.1'), true);
  assert.equal(isLoopbackAddress('127.42.0.9'), true);
  assert.equal(isLoopbackAddress('::1'), true);
  assert.equal(isLoopbackAddress('192.168.1.2'), false);
});

test('local VLC requests reject foreign origins and forwarded remote clients', () => {
  assert.equal(isTrustedLocalRequest(request({ 'sec-fetch-site': 'same-origin' })), true);
  assert.equal(isTrustedLocalRequest(request({ origin: 'https://evil.test' })), false);
  assert.equal(isTrustedLocalRequest(request({ 'x-forwarded-for': '203.0.113.7' })), false);
  assert.equal(isTrustedLocalRequest(request({ 'x-forwarded-host': 'public.example.test' })), false);
  assert.equal(isTrustedLocalRequest(request({}, 'https://example.test/api/open-vlc')), false);
});
