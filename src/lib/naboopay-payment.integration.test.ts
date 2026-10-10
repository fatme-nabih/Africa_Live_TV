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
import { applyVerifiedNabooPayPayment as applyPayment } from './naboopay-payment';
import type { NabooPayTransactionPayload, NabooPayStatus } from './naboopay';
import { NabooPayTransactionPayloadSchema } from './naboopay';
import { evaluateUserAccess } from './refund-trial-access';
import { NABOOPAY_PLANS } from './naboopay-payment';
import * as apiErrors from './api-errors';
import { loadSource } from '../../e2e/helpers/load-source';

const integrationEnabled = process.env.CLERK_BILLING_INTEGRATION_TEST === '1';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fixed webhook timestamps, each 1 minute apart, for deterministic ordering. */
const T1 = '2026-09-01T10:01:00.000Z';
const T2 = '2026-09-01T10:02:00.000Z';
const T3 = '2026-09-01T10:03:00.000Z';


const DAY_MS = 86_400_000;
const TEST_NOW = new Date(T1);
const applyVerifiedNabooPayPayment = (payload: NabooPayTransactionPayload) => applyPayment(payload, TEST_NOW);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createdUserIds: string[] = [];

test('B01: actual checkout handler returns its owned terminal order without URL, provider call or history change', { skip: !integrationEnabled }, async () => {
  await assertIntegrationTarget(pool);
  const userId = await seedUser(), order = await seedTransaction(userId);
  await db.update(naboopayTransactions).set({ status:'completed',checkoutUrl:'https://checkout.naboopay.com/old' }).where(eq(naboopayTransactions.id,order.id));
  const [row] = await db.select().from(naboopayTransactions).where(eq(naboopayTransactions.id,order.id));
  const [user] = await db.select().from(users).where(eq(users.id,userId));
  let providerCalls = 0;
  const { POST } = loadSource('app/api/checkout/naboopay/route.ts',{ '@/db':{ db },'@/db/schema':{ users,subscriptions,naboopayTransactions },'@clerk/nextjs/server':{ auth:async()=>({ userId:user.clerkUserId }) },'@/lib/identity':{ ensureInternalUser:async()=>user },'@/lib/api-errors':apiErrors,'@/lib/naboopay-payment':{ NABOOPAY_PLANS },'@/lib/naboopay':{ createNabooPayTransaction:async()=>{ providerCalls++; throw new Error('unexpected provider call'); } },'@/lib/rate-limit':{ consumeRateLimit:async()=>({ allowed:true }) } }) as { POST:(request:Request,context:unknown)=>Promise<Response> };
  const previous = process.env.PAYMENTS_ENABLED; process.env.PAYMENTS_ENABLED = 'true';
  try {
    const payload = JSON.stringify({ planCode:row.planCode,firstName:'Test',lastName:'User',phone:'+221770000000',idempotencyKey:row.idempotencyKey });
    assert.equal((await POST(new Request('http://localhost:3001/api/checkout/naboopay',{ method:'POST',headers:{ 'content-type':'application/json' },body:payload }),{})).status,409);
    const response = await POST(new Request('http://localhost:3001/api/checkout/naboopay',{ method:'POST',headers:{ 'content-type':'application/json','x-checkout-protocol':'2' },body:payload }),{});
    assert.equal(response.status,200); assert.equal((await response.json()).checkout_url,null); assert.equal(providerCalls,0);
    assert.deepEqual((await db.select().from(naboopayTransactions).where(eq(naboopayTransactions.id,row.id)))[0],row);
  } finally { if (previous === undefined) delete process.env.PAYMENTS_ENABLED; else process.env.PAYMENTS_ENABLED = previous; }
});

test('B01: actual status handler refuses an attempt owned by a different account', { skip: !integrationEnabled }, async () => {
  await assertIntegrationTarget(pool);
  const a = await seedUser(), b = await seedUser(), order = await seedTransaction(a);
  const [row] = await db.select().from(naboopayTransactions).where(eq(naboopayTransactions.id,order.id));
  const [user] = await db.select().from(users).where(eq(users.id,b));
  const { GET } = loadSource('app/api/checkout/status/route.ts',{ '@/db':{ db },'@/db/schema':{ naboopayTransactions },'@clerk/nextjs/server':{ auth:async()=>({ userId:user.clerkUserId }) },'@/lib/identity':{ ensureInternalUser:async()=>user },'@/lib/api-errors':apiErrors }) as { GET:(request:Request,context:unknown)=>Promise<Response> };
  assert.equal((await GET(new Request('http://localhost:3001/api/checkout/status?checkout_attempt_id=' + row.checkoutAttemptId),{})).status,404);
});

test('A1: verified purchase/refund at J1 restores J5 trial, replay and expiration are stable', { skip: !integrationEnabled }, async () => {
  await assertIntegrationTarget(pool);
  const userId = await seedUser();
  const trialEnd = new Date(TEST_NOW.getTime() + 4 * DAY_MS).toISOString();
  await db.update(users).set({ trialEndsAt: trialEnd }).where(eq(users.id, userId));
  const order = await seedTransaction(userId);
  const paid = NabooPayTransactionPayloadSchema.parse(webhookPayload(order, 'completed', T1, T1));
  const refund = NabooPayTransactionPayloadSchema.parse(webhookPayload(order, 'refunded', T2, T1));
  await applyPayment(paid, TEST_NOW); await applyPayment(refund, TEST_NOW);
  const read = async (now = TEST_NOW) => {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return evaluateUserAccess(user, rows, now);
  };
  assert.equal((await read()).status, 'trial'); assert.equal((await read()).expiresAt, trialEnd);
  await applyPayment(refund, TEST_NOW); assert.equal((await read()).expiresAt, trialEnd);
  assert.equal((await read(new Date(trialEnd))).hasAccess, false);
  for (const status of ['blocked', 'deleted']) {
    await db.update(users).set({ status }).where(eq(users.id, userId));
    assert.equal((await read()).hasAccess, false);
  }
});

/** Create a test user with an expired trial (5 days ago). */
async function seedUser() {
  const id = randomUUID();
  await db.insert(users).values({
    id,
    clerkUserId: `clerk_integ_${id}`,
    email: `integ-${id.slice(0, 8)}@test.local`,
    status: 'active',
    trialStartedAt: new Date(TEST_NOW.getTime() - 10 * DAY_MS).toISOString(),
    trialEndsAt: new Date(TEST_NOW.getTime() - 5 * DAY_MS).toISOString(),
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

/** Assert the exact acquired end, with an explicit offset for fixture purchases. */
function assertDaysFromNow(actual: string | null, expectedDays: number, label: string) {
  assert.ok(actual, `${label}: date should not be null`);
  const actualMs = new Date(actual).getTime();
  const expectedMs = TEST_NOW.getTime() + expectedDays * DAY_MS;
  assert.equal(actualMs,expectedMs,label);
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
  await pool.end();
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
  assert.equal(expiredSub?.currentPeriodStart,null);

  // The acquired end returns to the trial; access status is expired.
  const drift = Math.abs(
    new Date(expiredSub!.currentPeriodEnd!).getTime() - TEST_NOW.getTime(),
  );
  assert.equal(drift, 5 * DAY_MS);
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
    30+1/1440,
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
  assertDaysFromNow(sub.currentPeriodEnd, 30+1/1440, 'Period should be 30 days from the verified purchase');
});

test('F1: pending/failed keep ten remaining days and cannot reactivate an expired purchase', { skip: !integrationEnabled }, async () => {
  const userId=await seedUser();const paid=await seedTransaction(userId);
  await applyPayment(webhookPayload(paid,'completed',T1,T1),TEST_NOW);
  const before=await getUserSubscription(userId);
  const later=new Date(TEST_NOW.getTime()+20*DAY_MS);const pending=await seedTransaction(userId);
  await applyPayment(webhookPayload(pending,'pending',later.toISOString()),later);
  assert.deepEqual(await getUserSubscription(userId),before);
  assert.equal(Date.parse(before!.currentPeriodEnd!)-later.getTime(),10*DAY_MS);
  const expired=new Date(TEST_NOW.getTime()+40*DAY_MS);
  await applyPayment(webhookPayload(pending,'failed',expired.toISOString()),expired);
  assert.deepEqual(await getUserSubscription(userId),before);
  assert.ok(Date.parse(before!.currentPeriodEnd!)<expired.getTime());
});
test('F1: different concurrent purchases accumulate once; refund preserves the original payment date', { skip: !integrationEnabled }, async () => {
  const userId=await seedUser();const a=await seedTransaction(userId),b=await seedTransaction(userId);
  await Promise.all([applyVerifiedNabooPayPayment(webhookPayload(a,'completed',T1,T1)),applyVerifiedNabooPayPayment(webhookPayload(b,'completed',T2,T2))]);
  assert.equal(Date.parse((await getUserSubscription(userId))!.currentPeriodEnd!)-TEST_NOW.getTime(),60*DAY_MS);
  await applyVerifiedNabooPayPayment(webhookPayload(a,'refunded',T3));
  const [row]=await db.select().from(naboopayTransactions).where(eq(naboopayTransactions.id,a.id));
  assert.equal(new Date(row.paidAt!).toISOString(),T1);
  assert.equal(new Date((await getUserSubscription(userId))!.currentPeriodEnd!).toISOString(),new Date(Date.parse(T2)+30*DAY_MS).toISOString());
});

test('F1: other providers are preserved; completed-but-unfulfilled recovers once with original dates', {skip:!integrationEnabled},async()=>{
  const userId=await seedUser();const order=await seedTransaction(userId);
  const providerId=randomUUID();
  await db.insert(subscriptions).values({id:providerId,userId,provider:'clerk_billing',providerSubscriptionId:'fixture-'+randomUUID(),status:'active',currentPeriodStart:T1,currentPeriodEnd:'2027-09-01T10:01:00Z'});
  const [before]=await db.select().from(subscriptions).where(eq(subscriptions.id,providerId));
  await db.update(naboopayTransactions).set({status:'completed',providerUpdatedAt:T3,paidAt:T1}).where(eq(naboopayTransactions.id,order.id));
  const later=new Date('2026-11-01T00:00:00Z');
  assert.equal((await applyPayment(webhookPayload(order,'completed',T1,T1),later)).outcome,'fulfilled');
  const sub=await getUserSubscription(userId);
  assert.equal(sub?.status,'expired');
  assert.equal(new Date(sub!.currentPeriodStart!).toISOString(),T1);
  assert.equal(new Date(sub!.currentPeriodEnd!).toISOString(),'2026-10-01T10:01:00.000Z');
  const [recovered]=await db.select().from(naboopayTransactions).where(eq(naboopayTransactions.id,order.id));
  assert.equal(new Date(recovered.providerUpdatedAt!).toISOString(),T3);
  assert.equal((await applyPayment(webhookPayload(order,'completed',T1,T1),later)).outcome,'updated');
  await applyPayment(webhookPayload(order,'refunded',T2),later);
  assert.equal((await getUserSubscription(userId))!.currentPeriodEnd,sub!.currentPeriodEnd);
  await applyPayment(webhookPayload(order,'refunded',new Date(Date.parse(T3)+60_000).toISOString()),later);
  assert.equal((await getUserSubscription(userId))!.currentPeriodStart,null);
  assert.deepEqual((await db.select().from(subscriptions).where(eq(subscriptions.id,providerId)))[0],before);
});
