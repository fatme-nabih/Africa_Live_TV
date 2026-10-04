import assert from 'node:assert/strict';
import test from 'node:test';

import { clerkFrontendApiOrigin } from './clerk-csp';

const key = (kind: 'test' | 'live', host: string) => `pk_${kind}_${Buffer.from(`${host}$`).toString('base64')}`;

test('Clerk frontend API origin is derived from the publishable key', () => {
  assert.equal(clerkFrontendApiOrigin(key('live', 'clerk.africatv.sn')), 'https://clerk.africatv.sn');
  assert.equal(clerkFrontendApiOrigin(key('test', 'healthy-cattle-4414.clerk.accounts.dev')), 'https://healthy-cattle-4414.clerk.accounts.dev');
});

test('missing or malformed keys add no CSP origin', () => {
  for (const value of [undefined, '', 'pk_live_', 'sk_live_abc', 'pk_live_!!!', key('live', 'evil.com; script-src *'), key('live', 'localhost')]) {
    assert.equal(clerkFrontendApiOrigin(value), null, String(value));
  }
});
