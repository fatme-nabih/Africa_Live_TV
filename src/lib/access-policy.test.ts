import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateAccess, type AccessSubscription, type AccessUser } from './access-policy';

const now = new Date('2026-07-22T12:00:00.000Z');
const activeUser: AccessUser = {
  status: 'active',
  trialEndsAt: '2026-08-01T00:00:00.000Z',
};

function subscription(overrides: Partial<AccessSubscription>): AccessSubscription {
  return {
    status: 'active',
    currentPeriodEnd: '2026-08-22T00:00:00.000Z',
    trialEndsAt: null,
    graceEndsAt: null,
    ...overrides,
  };
}

test('access matrix: anonymous', () => {
  assert.deepEqual(evaluateAccess(null, [], now), {
    status: 'anonymous',
    hasAccess: false,
    expiresAt: null,
    reason: 'authentication_required',
  });
});

test('access matrix: active trial', () => {
  const decision = evaluateAccess(activeUser, [], now);
  assert.equal(decision.status, 'trial');
  assert.equal(decision.hasAccess, true);
});

test('access matrix: active subscription', () => {
  const decision = evaluateAccess(activeUser, [subscription({})], now);
  assert.equal(decision.status, 'active');
  assert.equal(decision.hasAccess, true);
});

test('access matrix: expired trial', () => {
  const decision = evaluateAccess(
    { ...activeUser, trialEndsAt: '2026-07-01T00:00:00.000Z' },
    [],
    now,
  );
  assert.equal(decision.status, 'expired');
  assert.equal(decision.hasAccess, false);
});

test('access matrix: payment overdue after grace', () => {
  const decision = evaluateAccess(
    activeUser,
    [
      subscription({
        status: 'past_due',
        currentPeriodEnd: '2026-07-10T00:00:00.000Z',
        graceEndsAt: '2026-07-13T00:00:00.000Z',
      }),
    ],
    now,
  );
  assert.equal(decision.status, 'past_due');
  assert.equal(decision.hasAccess, false);
});

test('access matrix: blocked identity always wins', () => {
  const decision = evaluateAccess(
    { ...activeUser, status: 'blocked' },
    [subscription({})],
    now,
  );
  assert.equal(decision.status, 'blocked');
  assert.equal(decision.hasAccess, false);
});

test('payment grace remains accessible until graceEndsAt', () => {
  const decision = evaluateAccess(
    activeUser,
    [
      subscription({
        status: 'past_due',
        currentPeriodEnd: '2026-07-21T00:00:00.000Z',
        graceEndsAt: '2026-07-24T00:00:00.000Z',
      }),
    ],
    now,
  );
  assert.equal(decision.status, 'grace');
  assert.equal(decision.hasAccess, true);
});
