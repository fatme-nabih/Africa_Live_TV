import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeClerkBillingEvent } from './clerk-billing';

const now = Date.UTC(2026, 6, 23);

function payer() {
  return {
    object: 'commerce_payer',
    id: 'payer_123',
    user_id: 'user_123',
  };
}

function item(overrides: Record<string, unknown> = {}) {
  return {
    object: 'commerce_subscription_item',
    id: 'subi_123',
    status: 'active',
    plan_period: 'month',
    period_start: now,
    period_end: now + 30 * 86_400_000,
    plan_id: 'plan_123',
    plan: {
      id: 'plan_123',
      slug: 'lumina-all-access-monthly',
    },
    ...overrides,
  };
}

test('normalizes a B2C subscription while discarding unrelated provider fields', () => {
  const result = normalizeClerkBillingEvent({
    object: 'event',
    type: 'subscription.active',
    data: {
      object: 'commerce_subscription',
      id: 'sub_123',
      status: 'active',
      payer: { ...payer(), email: 'not-retained@example.test' },
      created_at: now,
      updated_at: now + 1_000,
      active_at: now + 500,
      items: [item()],
      payment_source_id: 'not-retained',
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.event.kind, 'subscription');
  if (result.event.kind !== 'subscription') return;
  assert.equal(result.event.userId, 'user_123');
  assert.equal(result.event.status, 'active');
  assert.equal(result.event.items[0]?.planSlug, 'lumina-all-access-monthly');
  assert.equal('email' in result.event, false);
  assert.equal('paymentSourceId' in result.event, false);
});

test('normalizes a failed recurring payment without retaining payment-source details', () => {
  const result = normalizeClerkBillingEvent({
    object: 'event',
    type: 'paymentAttempt.updated',
    data: {
      object: 'commerce_payment_attempt',
      id: 'pa_123',
      payment_id: 'pay_123',
      statement_id: 'stmt_123',
      status: 'failed',
      charge_type: 'recurring',
      created_at: now,
      updated_at: now + 2_000,
      failed_at: now + 2_000,
      billing_date: now,
      failed_reason: {
        code: 'card_declined',
        decline_code: 'insufficient_funds',
      },
      payer: payer(),
      totals: {
        grand_total: {
          amount: 1_000.5,
          currency: 'USD',
        },
      },
      payment_source: {
        last4: '4242',
      },
      subscription_items: [item()],
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.event.kind, 'payment_attempt');
  if (result.event.kind !== 'payment_attempt') return;
  assert.equal(result.event.status, 'failed');
  assert.equal(result.event.totalAmount, 1_000.5);
  assert.equal(result.event.failureCode, 'card_declined');
  assert.deepEqual(result.event.subscriptionItemIds, ['subi_123']);
  assert.equal('paymentSource' in result.event, false);
});

test('rejects status and lifecycle-event contradictions', () => {
  const result = normalizeClerkBillingEvent({
    object: 'event',
    type: 'subscriptionItem.active',
    data: {
      ...item({ status: 'past_due' }),
      payer: payer(),
    },
  });

  assert.deepEqual(result, { ok: false, reason: 'event_status_mismatch' });
});

test('rejects an organization payer in the B2C contract', () => {
  const result = normalizeClerkBillingEvent({
    object: 'event',
    type: 'subscriptionItem.updated',
    data: {
      ...item(),
      payer: {
        object: 'commerce_payer',
        id: 'payer_org',
        organization_id: 'org_123',
      },
    },
  });

  assert.deepEqual(result, { ok: false, reason: 'unsupported_payer' });
});

test('rejects a standalone subscription-item event when Clerk omits its optional payer', () => {
  const result = normalizeClerkBillingEvent({
    object: 'event',
    type: 'subscriptionItem.updated',
    data: item(),
  });

  assert.deepEqual(result, { ok: false, reason: 'unsupported_payer' });
});

test('rejects oversized item collections before normalizing them', () => {
  const result = normalizeClerkBillingEvent({
    object: 'event',
    type: 'subscription.updated',
    data: {
      object: 'commerce_subscription',
      id: 'sub_123',
      status: 'active',
      payer: payer(),
      created_at: now,
      updated_at: now,
      items: Array.from({ length: 51 }, (_, index) => item({ id: `subi_${index}` })),
    },
  });

  assert.deepEqual(result, { ok: false, reason: 'payload_too_large' });
});

test('rejects malformed timestamps and overlong identifiers', () => {
  const invalidTimestamp = normalizeClerkBillingEvent({
    object: 'event',
    type: 'subscriptionItem.updated',
    data: {
      ...item({ period_start: Number.POSITIVE_INFINITY }),
      payer: payer(),
    },
  });
  const invalidId = normalizeClerkBillingEvent({
    object: 'event',
    type: 'subscriptionItem.updated',
    data: {
      ...item({ id: 'x'.repeat(257) }),
      payer: payer(),
    },
  });

  assert.deepEqual(invalidTimestamp, { ok: false, reason: 'invalid_payload' });
  assert.deepEqual(invalidId, { ok: false, reason: 'invalid_payload' });
});

test('rejects non-Billing events without treating them as malformed Billing payloads', () => {
  const result = normalizeClerkBillingEvent({
    object: 'event',
    type: 'user.created',
    data: { id: 'user_123' },
  });

  assert.deepEqual(result, { ok: false, reason: 'unsupported_event' });
});
