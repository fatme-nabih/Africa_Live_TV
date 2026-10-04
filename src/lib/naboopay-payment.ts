import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { naboopayTransactions, subscriptions, users } from '@/db/schema';

import type { NabooPayTransactionPayload, NabooPayStatus } from './naboopay';
import { calculatePaymentEntitlement } from './payment-entitlements';

export const NABOOPAY_PLANS = {
  lumina_all_access_monthly: {
    amount: 990,
    durationDays: 30,
    productName: 'Abonnement Mensuel Africa Live',
  },
  lumina_all_access_annual: {
    amount: 9_900,
    durationDays: 365,
    productName: 'Abonnement Annuel Africa Live',
  },
} as const;

export type NabooPayPlanCode = keyof typeof NABOOPAY_PLANS;

export class NabooPayPaymentMismatchError extends Error {
  constructor(readonly code: 'AMOUNT_MISMATCH' | 'CURRENCY_MISMATCH' | 'PRODUCT_MISMATCH') {
    super('La confirmation du fournisseur ne correspond pas à la commande locale.');
    this.name = 'NabooPayPaymentMismatchError';
  }
}

export function validateProviderPayment(
  transaction: { planCode: string; amount: number; currency: string },
  payload: NabooPayTransactionPayload,
) {
  const plan = NABOOPAY_PLANS[transaction.planCode as NabooPayPlanCode];
  if (!plan || payload.amount !== transaction.amount || payload.amount !== plan.amount) {
    throw new NabooPayPaymentMismatchError('AMOUNT_MISMATCH');
  }
  if (transaction.currency !== 'XOF' || payload.currency !== transaction.currency) {
    throw new NabooPayPaymentMismatchError('CURRENCY_MISMATCH');
  }
  if (
    payload.products.length !== 1 ||
    payload.products[0]?.name !== plan.productName ||
    payload.products[0]?.price !== plan.amount ||
    payload.products[0]?.quantity !== 1
  ) {
    throw new NabooPayPaymentMismatchError('PRODUCT_MISMATCH');
  }
  return plan;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

export async function applyVerifiedNabooPayPayment(payload: NabooPayTransactionPayload, now = new Date()) {
  return db.transaction(async (tx) => {
    // Every path locks the account first, then its order. Locking separate orders
    // first can deadlock when two payments update the same account concurrently.
    const [candidate] = await tx.select({ userId: naboopayTransactions.userId }).from(naboopayTransactions)
      .where(eq(naboopayTransactions.providerOrderId, payload.order_id));
    if (!candidate) return { outcome: 'unknown_order' as const };
    const [user] = await tx.select().from(users).where(eq(users.id, candidate.userId)).for('update');
    if (!user) return { outcome: 'unknown_order' as const };
    const [transaction] = await tx.select().from(naboopayTransactions)
      .where(eq(naboopayTransactions.providerOrderId, payload.order_id)).for('update');

    if (!transaction) return { outcome: 'unknown_order' as const };

    const payloadDate = new Date(payload.updated_at);
    const currentProviderDate = transaction.providerUpdatedAt ? new Date(transaction.providerUpdatedAt) : new Date(0);

    // Terminal states cannot transition back to pending/failed.
    const isCurrentlyTerminal = transaction.status === 'completed' || transaction.status === 'canceled' || transaction.status === 'refunded';
    
    // Ignore older or exact same date webhooks to prevent race conditions
    if (payloadDate <= currentProviderDate && !(payload.transaction_status === 'completed' && transaction.status === 'completed' && !transaction.fulfilledAt)) {
      return { outcome: 'updated' as const, status: transaction.status as NabooPayStatus };
    }

    // Prevent moving backward from a terminal state, unless it's a refund
    if (isCurrentlyTerminal && payload.transaction_status !== 'refunded' && !(transaction.status === 'completed' && !transaction.fulfilledAt && payload.transaction_status === 'completed')) {
      return { outcome: 'updated' as const, status: transaction.status as NabooPayStatus };
    }

    let fulfilledAt = transaction.fulfilledAt;

    if (payload.transaction_status === 'completed') {
      validateProviderPayment(transaction, payload);
      fulfilledAt = transaction.fulfilledAt ?? now.toISOString();
    }

    await tx.update(naboopayTransactions).set({
      status: payload.transaction_status,
      providerStatus: payload.transaction_status,
      providerCreatedAt: payload.created_at,
      paidAt: transaction.paidAt ?? (payload.transaction_status === 'completed' ? payload.paid_at ?? payload.updated_at : null),
      providerUpdatedAt: payloadDate > currentProviderDate ? payload.updated_at : transaction.providerUpdatedAt,
      updatedAt: now.toISOString(),
      fulfilledAt: fulfilledAt,
    }).where(eq(naboopayTransactions.id, transaction.id));

    // Non-payment events cannot regrant or repair historical rights.
    if (payload.transaction_status !== 'completed' && payload.transaction_status !== 'refunded') {
      return { outcome: 'updated' as const, status: payload.transaction_status };
    }

    // Fetch ALL non-refunded completed transactions to recalculate rights
    const allValidTransactions = await tx.select().from(naboopayTransactions).where(and(
      eq(naboopayTransactions.userId, transaction.userId),
      eq(naboopayTransactions.status, 'completed')
    )).orderBy(naboopayTransactions.paidAt);

    const entitlement = calculatePaymentEntitlement(user.trialEndsAt, allValidTransactions);
    let periodEnd = new Date(entitlement.currentPeriodEnd);
    let periodStart = entitlement.currentPeriodStart;

    const [existingSubscription] = await tx.select().from(subscriptions).where(and(
      eq(subscriptions.userId, transaction.userId),
      eq(subscriptions.provider, 'naboopay'),
    )).limit(1).for('update');

    // Preserve historical grants on a new purchase; reducing real legacy rights
    // is a separate repair operation. A verified refund follows the agreed
    // reconstruction rule. This branch never anchors an old purchase to now.
    if (existingSubscription?.currentPeriodEnd && payload.transaction_status === 'completed' && !transaction.fulfilledAt) {
      const previous = calculatePaymentEntitlement(user.trialEndsAt, allValidTransactions.filter(t => t.id !== transaction.id));
      const grantedEnd = Date.parse(existingSubscription.currentPeriodEnd);
      if (grantedEnd > Date.parse(previous.currentPeriodEnd)) {
        const paidDate = transaction.paidAt ?? payload.paid_at ?? payload.updated_at;
        const start = new Date(Math.max(grantedEnd, Date.parse(paidDate)));
        periodStart = start.toISOString();
        periodEnd = addDays(start, NABOOPAY_PLANS[transaction.planCode as NabooPayPlanCode].durationDays);
      }
    }
    if (entitlement.hasPurchases) {
      if (existingSubscription) {
        await tx.update(subscriptions).set({
          status: periodEnd > now ? 'active' : 'expired',
          planCode: entitlement.planCode!,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd.toISOString(),
          cancelAtPeriodEnd: true,
          graceEndsAt: null,
          updatedAt: now.toISOString(),
        }).where(eq(subscriptions.id, existingSubscription.id));
      } else {
        await tx.insert(subscriptions).values({
          id: randomUUID(),
          userId: transaction.userId,
          provider: 'naboopay',
          providerSubscriptionId: payload.order_id,
          planCode: entitlement.planCode!,
          status: periodEnd > now ? 'active' : 'expired',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd.toISOString(),
          cancelAtPeriodEnd: true,
        });
      }
    } else {
      // If there are no valid purchases (e.g. they were all refunded)
      if (existingSubscription) {
        await tx.update(subscriptions).set({
          status: 'expired',
          currentPeriodStart: null,
          currentPeriodEnd: entitlement.currentPeriodEnd,
          graceEndsAt: null,
          updatedAt: now.toISOString(),
        }).where(eq(subscriptions.id, existingSubscription.id));
      }
    }

    return { outcome: payload.transaction_status === 'completed' ? 'fulfilled' : 'updated' as const, status: payload.transaction_status };
  });
}
