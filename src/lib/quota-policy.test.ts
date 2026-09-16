import assert from 'node:assert/strict';
import test from 'node:test';

import {
  quotaTierForAccess,
  requestQuotaPolicies,
  resolutionQuotaPolicies,
} from './quota-policy';

test('resolution policies distinguish subscriber, session, network, channel and period', () => {
  const policies = resolutionQuotaPolicies({
    destination: 'web',
    tier: 'subscriber',
    channelId: 'channel-1',
    userId: 'user-1',
    clerkSessionId: 'session-1',
    networkFingerprint: 'network-hash',
  });

  assert.deepEqual(
    policies.map(({ dimension, limit, windowSeconds }) => ({
      dimension,
      limit,
      windowSeconds,
    })),
    [
      { dimension: 'user', limit: 30, windowSeconds: 60 },
      { dimension: 'user', limit: 180, windowSeconds: 3_600 },
      { dimension: 'channel', limit: 8, windowSeconds: 600 },
      { dimension: 'session', limit: 20, windowSeconds: 60 },
      { dimension: 'network', limit: 90, windowSeconds: 60 },
    ],
  );
});

test('trial resolution quotas are lower than subscriber quotas', () => {
  const common = {
    destination: 'vlc-mobile' as const,
    channelId: 'channel-1',
    userId: 'user-1',
    clerkSessionId: null,
    networkFingerprint: null,
  };
  const trial = resolutionQuotaPolicies({ ...common, tier: 'trial' });
  const subscriber = resolutionQuotaPolicies({ ...common, tier: 'subscriber' });
  assert.ok(trial[0].limit < subscriber[0].limit);
  assert.ok(trial[1].limit < subscriber[1].limit);
});

test('access state controls the quota tier', () => {
  assert.equal(
    quotaTierForAccess({
      status: 'active',
      hasAccess: true,
      expiresAt: null,
      reason: 'subscription_active',
    }),
    'subscriber',
  );
  assert.equal(
    quotaTierForAccess({
      status: 'grace',
      hasAccess: true,
      expiresAt: null,
      reason: 'payment_grace_period',
    }),
    'grace',
  );
  assert.throws(() =>
    quotaTierForAccess({
      status: 'expired',
      hasAccess: false,
      expiresAt: null,
      reason: 'subscription_expired',
    }),
  );
});

test('generic request quotas omit untrusted network and absent session dimensions', () => {
  assert.deepEqual(
    requestQuotaPolicies({
      bucket: 'channels.read',
      userLimit: 60,
      userId: 'user-1',
      clerkSessionId: null,
      networkFingerprint: null,
    }).map(({ dimension }) => dimension),
    ['user'],
  );
});
