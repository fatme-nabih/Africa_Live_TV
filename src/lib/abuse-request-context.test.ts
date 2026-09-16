import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAbuseRequestContext,
  networkPrefixFromAddress,
} from './abuse-request-context';

test('network prefixes minimize IPv4 and IPv6 addresses', () => {
  assert.equal(networkPrefixFromAddress('203.0.113.42'), '203.0.113.0/24');
  assert.equal(
    networkPrefixFromAddress('2001:db8:abcd:12::9'),
    '2001:0db8:abcd:0012::/64',
  );
  assert.equal(networkPrefixFromAddress('not-an-address'), null);
});

test('proxy headers remain disabled unless explicitly trusted', () => {
  const previous = process.env.ABUSE_TRUSTED_PROXY_HEADER;
  delete process.env.ABUSE_TRUSTED_PROXY_HEADER;
  try {
    const request = new Request('https://lumina.test', {
      headers: { 'x-forwarded-for': '203.0.113.42' },
    });
    assert.deepEqual(getAbuseRequestContext(request), {
      networkFingerprint: null,
      trustedProxyHeader: null,
    });
  } finally {
    if (previous === undefined) delete process.env.ABUSE_TRUSTED_PROXY_HEADER;
    else process.env.ABUSE_TRUSTED_PROXY_HEADER = previous;
  }
});

test('a trusted network is pseudonymized and never returned in clear text', () => {
  const previousHeader = process.env.ABUSE_TRUSTED_PROXY_HEADER;
  const previousSecret = process.env.ABUSE_HASH_SECRET;
  process.env.ABUSE_TRUSTED_PROXY_HEADER = 'x-forwarded-for';
  process.env.ABUSE_HASH_SECRET = 'a'.repeat(32);
  try {
    const request = new Request('https://lumina.test', {
      headers: { 'x-forwarded-for': '203.0.113.42, 198.51.100.1' },
    });
    const context = getAbuseRequestContext(request);
    assert.equal(context.networkFingerprint?.length, 64);
    assert.equal(context.networkFingerprint?.includes('203.0.113'), false);
  } finally {
    if (previousHeader === undefined) delete process.env.ABUSE_TRUSTED_PROXY_HEADER;
    else process.env.ABUSE_TRUSTED_PROXY_HEADER = previousHeader;
    if (previousSecret === undefined) delete process.env.ABUSE_HASH_SECRET;
    else process.env.ABUSE_HASH_SECRET = previousSecret;
  }
});
