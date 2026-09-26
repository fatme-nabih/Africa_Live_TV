import { randomUUID } from 'node:crypto';

import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { naboopayTransactions, subscriptions, users } from '@/db/schema';

import type { NabooPayTransactionPayload } from './naboopay';

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

export async function applyVerifiedNabooPayPayment(payload: NabooPayTransactionPayload) {
  return db.transaction(async (tx) => {
    const [transaction] = await tx.select().from(naboopayTransactions)
      .where(eq(naboopayTransactions.providerOrderId, payload.order_id)).for('update');

    if (!transaction) return { outcome: 'unknown_order' as const };

    if (payload.transaction_status !== 'completed') {
      await tx.update(naboopayTransactions).set({
        status: payload.transaction_status,
        providerStatus: payload.transaction_status,
        paidAt: payload.paid_at ?? null,
        updatedAt: new Date().toISOString(),
      }).where(eq(naboopayTransactions.id, transaction.id));
      return { outcome: 'updated' as const, status: payload.transaction_status };
    }

    const plan = validateProviderPayment(transaction, payload);
    if (transaction.fulfilledAt) {
      return { outcome: 'already_fulfilled' as const, status: 'completed' as const };
    }

    // The user row serializes simultaneous renewal payments for one account.
    await tx.select({ id: users.id }).from(users)
      .where(eq(users.id, transaction.userId)).for('update');

    const [existingSubscription] = await tx.select().from(subscriptions).where(and(
      eq(subscriptions.userId, transaction.userId),
      eq(subscriptions.provider, 'naboopay'),
      eq(subscriptions.planCode, transaction.planCode),
    )).orderBy(desc(subscriptions.currentPeriodEnd)).limit(1).for('update');

    const now = new Date();
    const currentEnd = existingSubscription?.currentPeriodEnd
      ? new Date(existingSubscription.currentPeriodEnd)
      : null;
    const periodStart = currentEnd && currentEnd > now ? currentEnd : now;
    const periodEnd = addDays(periodStart, plan.durationDays);

    if (existingSubscription) {
      await tx.update(subscriptions).set({
        status: 'active',
        currentPeriodStart: periodStart.toISOString(),
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
        planCode: transaction.planCode,
        status: 'active',
        currentPeriodStart: periodStart.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        cancelAtPeriodEnd: true,
      });
    }

    // This marker is written last. A completed transaction without fulfilledAt
    // is deliberately repairable by a later webhook or reconciliation pass.
    const fulfilledAt = now.toISOString();
    await tx.update(naboopayTransactions).set({
      status: 'completed',
      providerStatus: 'completed',
      providerCreatedAt: payload.created_at,
      paidAt: payload.paid_at ?? payload.updated_at,
      fulfilledAt,
      updatedAt: fulfilledAt,
    }).where(eq(naboopayTransactions.id, transaction.id));

    return { outcome: 'fulfilled' as const, status: 'completed' as const };
  });
}
