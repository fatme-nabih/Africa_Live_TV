import { createHash, randomUUID } from 'node:crypto';

import { isNull, lte, or } from 'drizzle-orm';

import { db } from '@/db';
import { clerkBillingEvents, subscriptions } from '@/db/schema';

import { PAYMENT_GRACE_DAYS } from './access-policy';
import {
  normalizeClerkBillingEvent,
  type ClerkBillingSubscriptionStatus,
  type NormalizedClerkBillingEvent,
  type NormalizedClerkSubscriptionItem,
} from './clerk-billing';
import { findInternalUserByClerkId } from './identity';

const INTERNAL_PLAN_CODE = 'lumina_all_access_monthly';
const DEFAULT_CLERK_PLAN_SLUG = 'lumina-all-access-monthly';

export class UnknownBillingUserError extends Error {
  constructor(readonly clerkUserId: string) {
    super('Clerk Billing user has not been synchronized yet.');
    this.name = 'UnknownBillingUserError';
  }
}

export type ClerkBillingProcessingResult = {
  duplicate: boolean;
  status: 'processed' | 'ignored';
  reason: string | null;
};

export function mapClerkSubscriptionStatus(
  status: ClerkBillingSubscriptionStatus,
): 'active' | 'past_due' | 'paused' | 'canceled' | 'expired' {
  switch (status) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'upcoming':
    case 'incomplete':
      return 'paused';
    case 'abandoned':
    case 'ended':
    case 'expired':
      return 'expired';
  }
}

function eligiblePlan(item: NormalizedClerkSubscriptionItem) {
  const configuredSlug =
    process.env.CLERK_BILLING_PLAN_SLUG?.trim() || DEFAULT_CLERK_PLAN_SLUG;
  const configuredPlanId = process.env.CLERK_BILLING_PLAN_ID?.trim() || null;
  return (
    item.planSlug === configuredSlug ||
    (configuredPlanId !== null && item.planId === configuredPlanId)
  );
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1_000);
}

function providerUpdatedAt(
  event: NormalizedClerkBillingEvent,
  item: NormalizedClerkSubscriptionItem,
) {
  if (event.kind === 'subscription') return event.updatedAt;
  const candidates = [
    item.periodStart,
    item.canceledAt,
    item.pastDueAt,
  ].filter((value): value is Date => value !== null);
  return new Date(Math.max(...candidates.map((value) => value.getTime())));
}

function subscriptionItems(event: NormalizedClerkBillingEvent) {
  if (event.kind === 'subscription') return event.items;
  if (event.kind === 'subscription_item') return [event.item];
  return [];
}

function payloadDigest(event: unknown) {
  return createHash('sha256').update(JSON.stringify(event)).digest('hex');
}

function validMessageId(value: string) {
  return value.length >= 1 && value.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value);
}

export async function processVerifiedClerkBillingEvent({
  messageId,
  event,
}: {
  messageId: string;
  event: unknown;
}): Promise<ClerkBillingProcessingResult> {
  if (!validMessageId(messageId)) {
    throw new TypeError('A valid Svix message identifier is required.');
  }

  const digest = payloadDigest(event);
  const normalized = normalizeClerkBillingEvent(event);
  if (!normalized.ok) {
    const eventType =
      typeof event === 'object' &&
      event !== null &&
      'type' in event &&
      typeof event.type === 'string'
        ? event.type.slice(0, 256)
        : 'unknown';
    const [inserted] = await db
      .insert(clerkBillingEvents)
      .values({
        messageId,
        eventType,
        payloadDigest: digest,
        status: 'ignored',
        reason: normalized.reason,
      })
      .onConflictDoNothing()
      .returning({ messageId: clerkBillingEvents.messageId });
    return {
      duplicate: inserted === undefined,
      status: 'ignored',
      reason: normalized.reason,
    };
  }

  const internalUser = await findInternalUserByClerkId(normalized.event.userId);
  if (!internalUser) throw new UnknownBillingUserError(normalized.event.userId);

  const eligibleItems = subscriptionItems(normalized.event).filter(eligiblePlan);
  const reason =
    normalized.event.kind === 'payment_attempt'
      ? 'payment_attempt_observed'
      : eligibleItems.length === 0
        ? 'plan_not_eligible'
        : null;

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(clerkBillingEvents)
      .values({
        messageId,
        eventType: normalized.event.type,
        resourceId: normalized.event.resourceId,
        payloadDigest: digest,
        status: reason ? 'ignored' : 'processed',
        reason,
      })
      .onConflictDoNothing()
      .returning({ messageId: clerkBillingEvents.messageId });
    if (!inserted) {
      return { duplicate: true, status: 'processed', reason: null };
    }

    for (const item of eligibleItems) {
      const providerStatus = mapClerkSubscriptionStatus(item.status);
      const mappedStatus =
        (providerStatus === 'active' || providerStatus === 'canceled') &&
        item.periodEnd === null
          ? 'expired'
          : providerStatus;
      const updatedAt = providerUpdatedAt(normalized.event, item).toISOString();
      const graceEndsAt =
        item.status === 'past_due' && item.pastDueAt
          ? addDays(item.pastDueAt, PAYMENT_GRACE_DAYS).toISOString()
          : null;
      await tx
        .insert(subscriptions)
        .values({
          id: randomUUID(),
          userId: internalUser.id,
          provider: 'clerk_billing',
          providerSubscriptionId: item.id,
          providerPriceId: item.planId,
          priceId: item.planId,
          planCode: INTERNAL_PLAN_CODE,
          status: mappedStatus,
          currentPeriodStart: item.periodStart.toISOString(),
          currentPeriodEnd: item.periodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd:
            mappedStatus === 'canceled' &&
            item.periodEnd !== null &&
            item.periodEnd.getTime() > Date.now(),
          graceEndsAt,
          providerUpdatedAt: updatedAt,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: subscriptions.providerSubscriptionId,
          set: {
            userId: internalUser.id,
            provider: 'clerk_billing',
            providerPriceId: item.planId,
            priceId: item.planId,
            planCode: INTERNAL_PLAN_CODE,
            status: mappedStatus,
            currentPeriodStart: item.periodStart.toISOString(),
            currentPeriodEnd: item.periodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd:
              mappedStatus === 'canceled' &&
              item.periodEnd !== null &&
              item.periodEnd.getTime() > Date.now(),
            graceEndsAt,
            providerUpdatedAt: updatedAt,
            updatedAt,
          },
          setWhere: or(
            isNull(subscriptions.providerUpdatedAt),
            lte(subscriptions.providerUpdatedAt, updatedAt),
          ),
        });
    }

    return {
      duplicate: false,
      status: reason ? ('ignored' as const) : ('processed' as const),
      reason,
    };
  });
}
