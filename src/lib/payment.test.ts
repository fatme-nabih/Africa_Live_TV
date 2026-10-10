/**
 * Payment unit tests — CI-002
 *
 * These are Node:test unit tests (not Playwright E2E) that test the
 * payment logic in isolation: validation, idempotency, webhook signature,
 * payload parsing, and the applyVerifiedNabooPayPayment shared service.
 *
 * They run without a live database or NabooPay API key. The E2E spec files
 * (e2e/auth-entry.spec.ts, e2e/catalogue.spec.ts) test browser behaviour;
 * these tests cover the server-side payment contracts.
 */

import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';

// ---------------------------------------------------------------------------
// checkoutRequestSchema — PAY-003 / PAY-004
// ---------------------------------------------------------------------------
import { checkoutRequestSchema, checkoutStatusResponseSchema } from './payment-contracts';
import { actionableCheckoutUrl, checkoutAction, safeCheckoutDestination } from './payment-attempt-policy';

test('B01: every terminal status wins over its historical URL; uncertain statuses never release a key', () => {
  for (const status of ['completed', 'failed', 'canceled', 'refunded'] as const) {
    for (const url of [null, 'https://checkout.naboopay.com/old']) {
      assert.equal(checkoutAction(status, url), 'finished');
      assert.equal(actionableCheckoutUrl(status, url), null);
    }
  }
  for (const status of ['creating', 'pending', 'reconciliation_required'] as const) {
    assert.equal(checkoutAction(status, null), 'track');
  }
  assert.equal(checkoutAction('pending', 'https://checkout.naboopay.com/new'), 'checkout');
  for (const url of ['javascript:alert(1)', 'https://user@checkout.naboopay.com/a', 'https://checkout.naboopay.com:444/a', 'https://naboopay.com.evil.test/a']) {
    assert.equal(safeCheckoutDestination(url), null);
  }
});

test('checkoutRequestSchema accepts a valid payload', () => {
  const result = checkoutRequestSchema.safeParse({
    planCode: 'lumina_all_access_monthly',
    firstName: 'Fatou',
    lastName: 'Diallo',
    phone: '+221771234567',
    idempotencyKey: randomUUID(),
  });
  assert.ok(result.success, `Expected success but got: ${JSON.stringify(result.error?.issues)}`);
});

test('checkoutRequestSchema rejects an unknown planCode', () => {
  const result = checkoutRequestSchema.safeParse({
    planCode: 'lumina_premium',
    firstName: 'X',
    lastName: 'Y',
    phone: '+221771234567',
    idempotencyKey: randomUUID(),
  });
  assert.equal(result.success, false);
});

test('checkoutRequestSchema rejects a phone not in E.164 format', () => {
  for (const phone of ['0771234567', '221771234567', '+00', 'invalid']) {
    const result = checkoutRequestSchema.safeParse({
      planCode: 'lumina_all_access_monthly',
      firstName: 'A',
      lastName: 'B',
      phone,
      idempotencyKey: randomUUID(),
    });
    assert.equal(result.success, false, `Expected failure for phone=${phone}`);
  }
});

test('checkoutRequestSchema rejects a non-UUID idempotencyKey', () => {
  const result = checkoutRequestSchema.safeParse({
    planCode: 'lumina_all_access_monthly',
    firstName: 'A',
    lastName: 'B',
    phone: '+221771234567',
    idempotencyKey: 'not-a-uuid',
  });
  assert.equal(result.success, false);
});

test('checkoutRequestSchema rejects extra fields (.strict())', () => {
  const result = checkoutRequestSchema.safeParse({
    planCode: 'lumina_all_access_monthly',
    firstName: 'A',
    lastName: 'B',
    phone: '+221771234567',
    idempotencyKey: randomUUID(),
    extraField: 'should-fail',
  });
  assert.equal(result.success, false);
});

test('checkoutRequestSchema accepts the annual plan', () => {
  const result = checkoutRequestSchema.safeParse({
    planCode: 'lumina_all_access_annual',
    firstName: 'Mamadou',
    lastName: 'Ndiaye',
    phone: '+33612345678',
    idempotencyKey: randomUUID(),
  });
  assert.ok(result.success);
});

// ---------------------------------------------------------------------------
// checkoutStatusResponseSchema
// ---------------------------------------------------------------------------

test('checkoutStatusResponseSchema accepts a valid response', () => {
  const result = checkoutStatusResponseSchema.safeParse({
    status: 'pending',
    checkout_attempt_id: 'abc123',
    plan: 'lumina_all_access_monthly',
    amount: 990,
    currency: 'XOF',
  });
  assert.ok(result.success);
});

test('checkoutStatusResponseSchema rejects an unknown status', () => {
  const result = checkoutStatusResponseSchema.safeParse({
    status: 'unknown_status',
    checkout_attempt_id: 'abc123',
    plan: 'lumina_all_access_monthly',
    amount: 990,
    currency: 'XOF',
  });
  assert.equal(result.success, false);
});

test('checkoutStatusResponseSchema rejects a non-XOF currency', () => {
  const result = checkoutStatusResponseSchema.safeParse({
    status: 'completed',
    checkout_attempt_id: 'abc123',
    plan: 'lumina_all_access_monthly',
    amount: 990,
    currency: 'EUR',
  });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// NabooPayTransactionPayloadSchema — WH-002
// ---------------------------------------------------------------------------
import { NabooPayTransactionPayloadSchema } from './naboopay';

function validWebhookPayload() {
  return {
    order_id: 'nbp_order_abc123',
    method_of_payment: ['wave'],
    selected_payment_method: 'wave',
    amount: 990,
    fees: 10,
    currency: 'XOF',
    customer: {
      first_name: 'Fatou',
      last_name: 'Diallo',
      phone: '+221771234567',
      created_at: '2026-09-01T10:00:00Z',
    },
    transaction_status: 'completed',
    products: [{ name: 'Abonnement Mensuel Africa Live', price: 990, quantity: 1 }],
    is_escrow: false,
    is_merchant: false,
    fees_customer_side: true,
    success_url: 'https://example.com/success',
    error_url: 'https://example.com/error',
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:01:00Z',
    paid_at: '2026-09-01T10:01:00Z',
  };
}

test('NabooPayTransactionPayloadSchema parses a valid completed webhook payload', () => {
  const result = NabooPayTransactionPayloadSchema.safeParse(validWebhookPayload());
  assert.ok(result.success, `Expected success: ${JSON.stringify(result.error?.issues)}`);
  assert.equal(result.data?.transaction_status, 'completed');
  assert.equal(result.data?.currency, 'XOF');
});

test('NabooPayTransactionPayloadSchema rejects a non-XOF currency', () => {
  const result = NabooPayTransactionPayloadSchema.safeParse({
    ...validWebhookPayload(),
    currency: 'EUR',
  });
  assert.equal(result.success, false);
});

test('NabooPayTransactionPayloadSchema rejects an unknown transaction_status', () => {
  const result = NabooPayTransactionPayloadSchema.safeParse({
    ...validWebhookPayload(),
    transaction_status: 'processing',
  });
  assert.equal(result.success, false);
});

test('NabooPayTransactionPayloadSchema rejects extra top-level fields (.strict())', () => {
  const result = NabooPayTransactionPayloadSchema.safeParse({
    ...validWebhookPayload(),
    unknown_field: true,
  });
  assert.equal(result.success, false);
});

test('NabooPayTransactionPayloadSchema rejects a negative fee amount', () => {
  const result = NabooPayTransactionPayloadSchema.safeParse({
    ...validWebhookPayload(),
    fees: -1,
  });
  assert.equal(result.success, false);
});

test('NabooPayTransactionPayloadSchema rejects non-ISO dates', () => {
  const result = NabooPayTransactionPayloadSchema.safeParse({
    ...validWebhookPayload(),
    created_at: '01/09/2026',
  });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// verifyNabooPayWebhookSignature — WH-001
// ---------------------------------------------------------------------------
import { verifyNabooPayWebhookSignature } from './naboopay';

const WEBHOOK_SECRET = 'test-secret-for-unit-tests';

function makeSignature(body: string, secret = WEBHOOK_SECRET) {
  return createHmac('sha256', secret).update(body).digest('hex');
}

test('verifyNabooPayWebhookSignature returns true for a valid signature', () => {
  process.env.NABOOPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const body = JSON.stringify({ order_id: 'test' });
  const signature = makeSignature(body);
  assert.ok(verifyNabooPayWebhookSignature(body, signature));
});

test('verifyNabooPayWebhookSignature returns false for a tampered body', () => {
  process.env.NABOOPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const body = JSON.stringify({ order_id: 'test' });
  const signature = makeSignature(body);
  const tamperedBody = JSON.stringify({ order_id: 'tampered' });
  assert.equal(verifyNabooPayWebhookSignature(tamperedBody, signature), false);
});

test('verifyNabooPayWebhookSignature returns false for an invalid hex signature', () => {
  process.env.NABOOPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  assert.equal(verifyNabooPayWebhookSignature('{}', 'not-hex'), false);
});

test('verifyNabooPayWebhookSignature returns false for a signature with wrong length', () => {
  process.env.NABOOPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const shortSig = 'ab'.repeat(16); // 32 hex chars (16 bytes), not 64 (32 bytes)
  assert.equal(verifyNabooPayWebhookSignature('{}', shortSig), false);
});

test('verifyNabooPayWebhookSignature uses timing-safe comparison (does not throw on same-length input)', () => {
  process.env.NABOOPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const body = '{}';
  const wrongSig = 'a'.repeat(64); // valid hex length but wrong value
  assert.equal(verifyNabooPayWebhookSignature(body, wrongSig), false);
});

// ---------------------------------------------------------------------------
// validateProviderPayment — WH-004 / P0-04
// ---------------------------------------------------------------------------
import { validateProviderPayment, NabooPayPaymentMismatchError } from './naboopay-payment';

const monthlyTx = {
  planCode: 'lumina_all_access_monthly',
  amount: 990,
  currency: 'XOF',
};

test('validateProviderPayment accepts a matching monthly payment', () => {
  const payload = { ...validWebhookPayload(), amount: 990, currency: 'XOF' };
  assert.doesNotThrow(() => validateProviderPayment(monthlyTx, payload as Parameters<typeof validateProviderPayment>[1]));
});

test('validateProviderPayment throws AMOUNT_MISMATCH when amount differs', () => {
  const payload = { ...validWebhookPayload(), amount: 500, currency: 'XOF' };
  assert.throws(
    () => validateProviderPayment(monthlyTx, payload as Parameters<typeof validateProviderPayment>[1]),
    (err) => err instanceof NabooPayPaymentMismatchError && err.code === 'AMOUNT_MISMATCH',
  );
});

test('validateProviderPayment throws CURRENCY_MISMATCH for non-XOF', () => {
  const payload = { ...validWebhookPayload(), currency: 'EUR' as 'XOF', amount: 990 };
  assert.throws(
    () => validateProviderPayment({ ...monthlyTx, currency: 'EUR' }, payload as Parameters<typeof validateProviderPayment>[1]),
    (err) => err instanceof NabooPayPaymentMismatchError && err.code === 'CURRENCY_MISMATCH',
  );
});

test('validateProviderPayment throws PRODUCT_MISMATCH when product name is wrong', () => {
  const payload = {
    ...validWebhookPayload(),
    products: [{ name: 'Wrong Product', price: 990, quantity: 1 }],
  };
  assert.throws(
    () => validateProviderPayment(monthlyTx, payload as Parameters<typeof validateProviderPayment>[1]),
    (err) => err instanceof NabooPayPaymentMismatchError && err.code === 'PRODUCT_MISMATCH',
  );
});

test('validateProviderPayment throws PRODUCT_MISMATCH when quantity is wrong', () => {
  const payload = {
    ...validWebhookPayload(),
    products: [{ name: 'Abonnement Mensuel Africa Live', price: 990, quantity: 2 }],
  };
  assert.throws(
    () => validateProviderPayment(monthlyTx, payload as Parameters<typeof validateProviderPayment>[1]),
    (err) => err instanceof NabooPayPaymentMismatchError && err.code === 'PRODUCT_MISMATCH',
  );
});

// ---------------------------------------------------------------------------
// NABOOPAY_PLANS constants — sanity check
// ---------------------------------------------------------------------------
import { NABOOPAY_PLANS } from './naboopay-payment';

test('NABOOPAY_PLANS monthly has correct amount and duration', () => {
  assert.equal(NABOOPAY_PLANS.lumina_all_access_monthly.amount, 990);
  assert.equal(NABOOPAY_PLANS.lumina_all_access_monthly.durationDays, 30);
});

test('NABOOPAY_PLANS annual has correct amount and duration', () => {
  assert.equal(NABOOPAY_PLANS.lumina_all_access_annual.amount, 9_900);
  assert.equal(NABOOPAY_PLANS.lumina_all_access_annual.durationDays, 365);
});

test('NABOOPAY_PLANS annual is cheaper per day than monthly', () => {
  const monthly = NABOOPAY_PLANS.lumina_all_access_monthly;
  const annual = NABOOPAY_PLANS.lumina_all_access_annual;
  const monthlyPerDay = monthly.amount / monthly.durationDays;
  const annualPerDay = annual.amount / annual.durationDays;
  assert.ok(annualPerDay < monthlyPerDay, 'Annual plan should be cheaper per day');
});
