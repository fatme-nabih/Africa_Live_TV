import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAccess } from './access-policy';

const user = { status: 'active', trialEndsAt: '2026-10-14T10:00:00.000Z' };
const expired = { status: 'expired', currentPeriodEnd: user.trialEndsAt, trialEndsAt: null, graceEndsAt: null };
const verified = { verifiedNabooPayRefundWithoutCompletedPurchase: true };
test('A1: verified full refund at J1 preserves exactly the original J5 trial', () => {
  const decision = evaluateAccess(user, [expired], new Date('2026-10-10T10:00:00Z'), verified);
  assert.equal(decision.status, 'trial'); assert.equal(decision.expiresAt, user.trialEndsAt);
});
test('A1: exact J5, late refund, uncertain order, restrictive provider and blocked identities remain denied', () => {
  for (const date of ['2026-10-14T10:00:00Z', '2026-10-15T10:00:00Z']) {
    assert.equal(evaluateAccess(user, [expired], new Date(date), verified).hasAccess, false);
  }
  const now = new Date('2026-10-10T10:00:00Z');
  assert.equal(evaluateAccess(user, [expired], now).hasAccess, false);
  for (const status of ['blocked', 'deleted']) assert.equal(evaluateAccess({ ...user, status }, [expired], now, verified).hasAccess, false);
  assert.equal(evaluateAccess(user, [{ ...expired, status: 'past_due', currentPeriodEnd: '2026-09-01T00:00:00Z' }], now, verified).status, 'past_due');
  assert.equal(evaluateAccess(user, [{ ...expired, status: 'active', currentPeriodEnd: '2026-11-01T00:00:00Z' }], now, verified).status, 'active');
});
