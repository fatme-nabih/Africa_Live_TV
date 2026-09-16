import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { eq, inArray } from 'drizzle-orm';

import { db, pool } from '@/db';
import { clerkBillingEvents, subscriptions, users } from '@/db/schema';

import { processVerifiedClerkBillingEvent } from './clerk-billing-sync';
import { syncClerkUser } from './identity';

const enabled = process.env.CLERK_BILLING_INTEGRATION_TEST === '1';

test(
  'Clerk Billing webhooks are idempotent and materialize subscription access',
  { skip: !enabled },
  async () => {
    const suffix = randomUUID();
    const clerkUserId = `user_billing_${suffix}`;
    const itemId = `subi_${suffix}`;
    const messageIds = [`msg_active_${suffix}`, `msg_due_${suffix}`];
    const now = Date.UTC(2026, 6, 23);

    const user = await syncClerkUser({
      clerkUserId,
      email: 'billing-test@example.test',
      status: 'active',
      createdAt: new Date(now),
    });
    const item = (status: 'active' | 'past_due') => ({
      object: 'commerce_subscription_item',
      id: itemId,
      status,
      plan_period: 'month',
      period_start: now,
      period_end: now + 30 * 86_400_000,
      past_due_at: status === 'past_due' ? now + 1_000 : null,
      plan_id: 'plan_test',
      plan: {
        id: 'plan_test',
        slug: 'lumina-all-access-monthly',
      },
    });
    const event = (
      type: 'subscriptionItem.active' | 'subscriptionItem.pastDue',
      status: 'active' | 'past_due',
    ) => ({
      object: 'event',
      type,
      data: {
        ...item(status),
        payer: {
          object: 'commerce_payer',
          id: `payer_${suffix}`,
          user_id: clerkUserId,
        },
      },
    });

    try {
      const activeEvent = event('subscriptionItem.active', 'active');
      assert.deepEqual(
        await processVerifiedClerkBillingEvent({
          messageId: messageIds[0],
          event: activeEvent,
        }),
        { duplicate: false, status: 'processed', reason: null },
      );
      assert.equal(
        (
          await processVerifiedClerkBillingEvent({
            messageId: messageIds[0],
            event: activeEvent,
          })
        ).duplicate,
        true,
      );

      const [activeSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.providerSubscriptionId, itemId));
      assert.equal(activeSubscription?.userId, user.id);
      assert.equal(activeSubscription?.provider, 'clerk_billing');
      assert.equal(activeSubscription?.status, 'active');

      await processVerifiedClerkBillingEvent({
        messageId: messageIds[1],
        event: event('subscriptionItem.pastDue', 'past_due'),
      });
      const [pastDueSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.providerSubscriptionId, itemId));
      assert.equal(pastDueSubscription?.status, 'past_due');
      assert.ok(pastDueSubscription?.graceEndsAt);
    } finally {
      await db
        .delete(clerkBillingEvents)
        .where(inArray(clerkBillingEvents.messageId, messageIds));
      await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
      await pool.end();
    }
  },
);
