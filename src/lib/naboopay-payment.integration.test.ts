/**
 * NabooPay payment integration tests — CI-003
 *
 * Verifies the transactional webhook processing pipeline
 * (`applyVerifiedNabooPayPayment`) against a real PostgreSQL database.
 *
 * Run with:  npm run test:integration
 *
 * The test runner (src/scripts/test-integration.ts) creates a disposable
 * isolated schema, applies all migrations, runs these tests sequentially,
 * then drops the schema.
 *
 * Scenarios covered (from billing audit):
 *   1. Completed payment creates active subscription with correct period
 *   2. Stale webhook (older updated_at) is silently rejected
 *   3. Duplicate webhook (same updated_at) is silently rejected
 *   4. Terminal state (completed) blocks backward transitions (failed/pending)
 *   5. Full refund → subscription expires immediately (not "canceled")
 *   6. Partial refund recalculates from remaining completed transactions
 *   7. Monthly → annual renewal accumulates remaining days
 *   8. Concurrent identical webhooks are serialized by FOR UPDATE locks
 *   9. Reconciliation: completed after failed succeeds
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';

import { and, eq } from 'drizzle-orm';

import { db, pool } from '../db';
import { naboopayTransactions, subscriptions, users } from '../db/schema';
import { assertIntegrationTarget } from './integration-test-safety';
import { applyVerifiedNabooPayPayment } from './naboopay-payment';
import type { NabooPayTransactionPayload, NabooPayStatus } from './naboopay';

const integrationEnabled = process.env.CLERK_BILLING_INTEGRATION_TEST === '1';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fixed webhook timestamps, each 1 minute apart, for deterministic ordering. */
const T1 = '2026-09-01T10:01:00.000Z';
const T2 = '2026-09-01T10:02:00.000Z';
const T3 = '2026-09-01T10:03:00.000Z';


const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createdUserIds: string[] = [];

/** Create a test user with an expired trial (5 days ago). */
async function seedUser() {
  const id = randomUUID();
  await db.insert(users).values({
    id,
    clerkUserId: `clerk_integ_${id}`,
    email: `integ-${id.slice(0, 8)}@test.local`,
    status: 'active',
    trialStartedAt: new Date(Date.now() - 10 * DAY_MS).toISOString(),
    trialEndsAt: new Date(Date.now() - 5 * DAY_MS).toISOString(),
  });
  createdUserIds.push(id);
  return id;
}

/** Insert a pending NabooPay transaction for a user. */
async function seedTransaction(
  userId: string,
  planCode: 'lumina_all_access_monthly' | 'lumina_all_access_annual' = 'lumina_all_access_monthly',
) {
  const id = randomUUID();
  const providerOrderId = `nbp_integ_${randomUUID()}`;
  const amount = planCode === 'lumina_all_access_monthly' ? 990 : 9_900;
  await db.insert(naboopayTransactions).values({
    id,
    checkoutAttemptId: randomUUID(),
    providerOrderId,
    idempotencyKey: randomUUID(),
    userId,
    planCode,
    amount,
    currency: 'XOF',
    status: 'pending',
  });
  return { id, providerOrderId, planCode, amount };
}

/** Build a valid NabooPay webhook payload matching a seeded transaction. */
function webhookPayload(
  tx: { providerOrderId: string; planCode: string; amount: number },
  status: NabooPayStatus,
  updatedAt: string,
  paidAt?: string,
): NabooPayTransactionPayload {
  const productName = tx.planCode === 'lumina_all_access_annual'
    ? 'Abonnement Annuel Africa Live'
    : 'Abonnement Mensuel Africa Live';
  return {
    order_id: tx.providerOrderId,
    method_of_payment: ['wave'],
    selected_payment_method: 'wave',
    amount: tx.amount,
    fees: 10,
    currency: 'XOF' as const,
    customer: {
      first_name: 'Test',
      last_name: 'Integration',
      phone: '+221770000000',
      created_at: updatedAt,
    },
    transaction_status: status,
    products: [{ name: productName, price: tx.amount, quantity: 1 }],
    is_escrow: false,
    is_merchant: false,
    fees_customer_side: true,
    success_url: 'https://integration.test/success',
    error_url: 'https://integration.test/error',
    created_at: updatedAt,
    updated_at: updatedAt,
    ...(paidAt != null ? { paid_at: paidAt } : {}),
  };
}

/** Read the NabooPay subscription for a user, or null. */
async function getUserSubscription(userId: string) {
  const [sub] = await db.select().from(subscriptions).where(and(
    eq(subscriptions.userId, userId),
    eq(subscriptions.provider, 'naboopay'),
  ));
  return sub ?? null;
}

/** Assert that a date is approximately N days from now (±1 day tolerance). */
function assertDaysFromNow(actual: string | null, expectedDays: number, label: string) {
  assert.ok(actual, `${label}: date should not be null`);
  const actualMs = new Date(actual).getTime();
  const expectedMs = Date.now() + expectedDays * DAY_MS;
  const driftDays = Math.abs(actualMs - expectedMs) / DAY_MS;
  assert.ok(
    driftDays < 1,
    `${label}: expected ~${expectedDays} days from now, drift was ${driftDays.toFixed(2)} days`,
  );
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

before(async () => {
  if (!integrationEnabled) return;
  await assertIntegrationTarget(pool);
});

after(async () => {
  if (!integrationEnabled) return;
  // Users cascade-delete to naboopay_transactions and subscriptions.
  for (const id of createdUserIds) {
    await db.delete(users).where(eq(users.id, id));
  }
});

// ---------------------------------------------------------------------------
// 1. Completed payment creates active subscription
// ---------------------------------------------------------------------------

test('completed payment creates an active subscription with correct period', { skip: !integrationEnabled }, async () => {
  const userId = await seedUser();
  const tx = await seedTransaction(userId);

  const result = await applyVerifiedNabooPayPayment(
    webhookPayload(tx, 'completed', T1, T1),
  );
  assert.equal(result.outcome, 'fulfilled');

  // Transaction row
  const [dbTx] = await db.select().from(naboopayTransactions)
    .where(eq(naboopayTransactions.id, tx.id));
  assert.equal(dbTx.status, 'completed');
  assert.equal(new Date(dbTx.providerUpdatedAt!).toISOString(), T1);
  assert.ok(dbTx.fulfilledAt, 'fulfilledAt should be set');

  // Subscription row
  const sub = await getUserSubscription(userId);
  assert.ok(sub, 'Subscription should be created');
  assert.equal(sub.status, 'active');
  assert.equal(sub.planCode, 'lumina_all_access_monthly');
  assertDaysFromNow(sub.currentPeriodEnd, 30, 'Monthly period end');
});

// ---------------------------------------------------------------------------
// 2. Stale webhook (older updated_at) is rejected
// ---------------------------------------------------------------------------

test('stale webhook with older updated_at is silently rejected', { skip: !integrationEnabled }, async () => {
  const userId = await seedUser();
  const tx = await seedTransaction(userId);

  // Process completed at T2
  await applyVerifiedNabooPayPayment(webhookPayload(tx, 'completed', T2, T2));

  // Stale pending arrives with T1 < T2
  const result = await applyVerifiedNabooPayPayment(
    webhookPayload(tx, 'pending', T1),
  );
  assert.equal(result.outcome, 'updated');

  // Must remain completed
  const [dbTx] = await db.select().from(naboopayTransactions)
    .where(eq(naboopayTransactions.id, tx.id));
  assert.equal(dbTx.status, 'completed', 'Transaction must remain completed');
});

// ---------------------------------------------------------------------------
// 3. Duplicate webhook (same updated_at) is rejected
// ---------------------------------------------------------------------------

test('duplicate webhook with identical updated_at is rejected', { skip: !integrationEnabled }, async () => {
  const userId = await seedUser();
  const tx = await seedTransaction(userId);

  const first = await applyVerifiedNabooPayPayment(
    webhookPayload(tx, 'completed', T1, T1),
  );
  assert.equal(first.outcome, 'fulfilled');

  const second = await applyVerifiedNabooPayPayment(
    webhookPayload(tx, 'completed', T1, T1),
  );
  assert.equal(second.outcome, 'updated');
  assert.equal(second.status, 'completed');
});

// ---------------------------------------------------------------------------
// 4. Terminal state blocks backward transitions
// ---------------------------------------------------------------------------

test('completed transaction rejects a newer failed webhook', { skip: !integrationEnabled }, async () => {
  const userId = await seedUser();
  const tx = await seedTransaction(userId);

  await applyVerifiedNabooPayPayment(webhookPayload(tx, 'completed', T1, T1));

  // Failed at T2 > T1 — newer timestamp, but backward transition
  const result = await applyVerifiedNabooPayPayment(
    webhookPayload(tx, 'failed', T2),
  );
  assert.equal(result.outcome, 'updated');
  assert.equal(result.status, 'completed');

  const [dbTx] = await db.select().from(naboopayTransactions)
    .where(eq(naboopayTransactions.id, tx.id));
  assert.equal(dbTx.status, 'completed', 'Terminal state must not regress');
});

// ---------------------------------------------------------------------------
// 5. Full refund → subscription expires immediately
// ---------------------------------------------------------------------------

test('full refund sets subscription to expired with immediate cutoff', { skip: !integrationEnabled }, async () => {
  const userId = await seedUser();
  const tx = await seedTransaction(userId);

  await applyVerifiedNabooPayPayment(webhookPayload(tx, 'completed', T1, T1));

  // Verify active
  const activeSub = await getUserSubscription(userId);
  assert.equal(activeSub?.status, 'active');

  // Refund
  const refundResult = await applyVerifiedNabooPayPayment(
    webhookPayload(tx, 'refunded', T2),
  );
  assert.equal(refundResult.status, 'refunded');

  // Transaction must be refunded
  const [dbTx] = await db.select().from(naboopayTransactions)
    .where(eq(naboopayTransactions.id, tx.id));
  assert.equal(dbTx.status, 'refunded');

  // Subscription must be EXPIRED (not canceled) → immediate revocation
  const expiredSub = await getUserSubscription(userId);
  assert.equal(expiredSub?.status, 'expired', 'Must be expired, not canceled');

  // Period end should be ≈ now (immediate cutoff, not end-of-period)
  const drift = Math.abs(
    new Date(expiredSub!.currentPeriodEnd!).getTime() - Date.now(),
  );
  assert.ok(drift < 10_000, `Period end should be ≈ now, drift was ${drift}ms`);
});

// ---------------------------------------------------------------------------
// 6. Partial refund recalculates from remaining completed transactions
// ---------------------------------------------------------------------------

test('partial refund keeps subscription active with recalculated period', { skip: !integrationEnabled }, async () => {
  const userId = await seedUser();
  const tx1 = await seedTransaction(userId, 'lumina_all_access_monthly');
  const tx2 = await seedTransaction(userId, 'lumina_all_access_monthly');

  // Complete both payments
  await applyVerifiedNabooPayPayment(webhookPayload(tx1, 'completed', T1, T1));
  await applyVerifiedNabooPayPayment(webhookPayload(tx2, 'completed', T2, T2));

  // Refund only the first transaction
  await applyVerifiedNabooPayPayment(webhookPayload(tx1, 'refunded', T3));

  // One valid payment remains → still active
  const sub = await getUserSubscription(userId);
  assert.equal(sub?.status, 'active', 'One valid payment remains → still active');
  assertDaysFromNow(
    sub!.currentPeriodEnd,
    30,
    'Period should reflect one monthly payment only',
  );
});

// ---------------------------------------------------------------------------
// 7. Monthly → annual renewal accumulates days
// ---------------------------------------------------------------------------

test('monthly then annual renewal accumulates 30 + 365 days', { skip: !integrationEnabled }, async () => {
  const userId = await seedUser();
  const monthlyTx = await seedTransaction(userId, 'lumina_all_access_monthly');
  const annualTx = await seedTransaction(userId, 'lumina_all_access_annual');

  await applyVerifiedNabooPayPayment(
    webhookPayload(monthlyTx, 'completed', T1, T1),
  );
  await applyVerifiedNabooPayPayment(
    webhookPayload(annualTx, 'completed', T2, T2),
  );

  const sub = await getUserSubscription(userId);
  assert.equal(sub?.status, 'active');
  assert.equal(sub?.planCode, 'lumina_all_access_annual', 'Plan code reflects latest purchase');
  assertDaysFromNow(
    sub!.currentPeriodEnd,
    395,
    'Period should be 30 + 365 = 395 days',
  );
});

// ---------------------------------------------------------------------------
// 8. Concurrent identical webhooks are serialized
// ---------------------------------------------------------------------------

test('concurrent identical webhooks: one fulfills, one is rejected', { skip: !integrationEnabled }, async () => {
  const userId = await seedUser();
  const tx = await seedTransaction(userId);

  const payload = webhookPayload(tx, 'completed', T1, T1);

  // Fire two identical webhooks simultaneously
  const [r1, r2] = await Promise.all([
    applyVerifiedNabooPayPayment(payload),
    applyVerifiedNabooPayPayment(payload),
  ]);

  const outcomes = [r1.outcome, r2.outcome].sort();
  assert.deepEqual(
    outcomes,
    ['fulfilled', 'updated'],
    'Exactly one should fulfill, the other should be rejected as duplicate',
  );

  // Only one subscription should exist
  const subs = await db.select().from(subscriptions).where(and(
    eq(subscriptions.userId, userId),
    eq(subscriptions.provider, 'naboopay'),
  ));
  assert.equal(subs.length, 1, 'Only one subscription should be created');
  assert.equal(subs[0].status, 'active');
});

// ---------------------------------------------------------------------------
// 9. Reconciliation: completed after failed succeeds
// ---------------------------------------------------------------------------

test('reconciliation: completed webhook after failed creates subscription', { skip: !integrationEnabled }, async () => {
  const userId = await seedUser();
  const tx = await seedTransaction(userId);

  // Provider initially reports failure
  const failResult = await applyVerifiedNabooPayPayment(
    webhookPayload(tx, 'failed', T1),
  );
  assert.equal(failResult.outcome, 'updated');

  let sub = await getUserSubscription(userId);
  assert.equal(sub, null, 'No subscription should exist after failure');

  // Provider reconciles: payment actually succeeded
  const reconcileResult = await applyVerifiedNabooPayPayment(
    webhookPayload(tx, 'completed', T2, T2),
  );
  assert.equal(reconcileResult.outcome, 'fulfilled');

  sub = await getUserSubscription(userId);
  assert.ok(sub, 'Subscription should be created after reconciliation');
  assert.equal(sub.status, 'active');
  assertDaysFromNow(sub.currentPeriodEnd, 30, 'Period should be 30 days');
});
