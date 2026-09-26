import { verifyNabooPayWebhookSignature, NabooPayTransactionPayload } from '@/lib/naboopay';
import { db } from '@/db';
import { naboopayTransactions, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { BadRequestError, UnauthorizedError, withApiErrorHandler } from '@/lib/api-errors';
import { structuredLog } from '@/lib/structured-log';
import { readBoundedJsonText } from '@/lib/bounded-json';
import { z } from 'zod';

const webhookSchema = z.object({
  order_id: z.string(),
  transaction_status: z.enum(['pending', 'completed', 'failed', 'canceled']),
  amount: z.number(),
  currency: z.string(),
}).passthrough();

export const POST = withApiErrorHandler(async (request: Request) => {
  const signature = request.headers.get('X-Signature');
  if (!signature) {
    throw new UnauthorizedError('Signature manquante', 'MISSING_SIGNATURE');
  }

  // Limiter la taille du payload (ex: 64KB)
  const payloadStr = await readBoundedJsonText(request, 64 * 1024);
  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(payloadStr);
  } catch {
    throw new BadRequestError('JSON invalide', 'INVALID_JSON');
  }

  const parseResult = webhookSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    throw new BadRequestError('Payload invalide', 'INVALID_PAYLOAD');
  }
  const payload = parseResult.data as unknown as NabooPayTransactionPayload;

  const isValid = await verifyNabooPayWebhookSignature(payloadStr, signature);
  if (!isValid) {
    throw new UnauthorizedError('Signature invalide', 'INVALID_SIGNATURE');
  }

  const orderId = payload.order_id;
  const status = payload.transaction_status;
  const amount = payload.amount;
  const currency = payload.currency;

  const result = await db.transaction(async (tx) => {
    // Fetch the pending transaction with a lock
    const [transaction] = await tx.select().from(naboopayTransactions).where(eq(naboopayTransactions.orderId, orderId)).for('update');
    
    if (!transaction) {
      structuredLog('warn', 'naboopay.webhook.unknown_order', { orderId });
      return NextResponse.json({ status: 'ignored_unknown_order' }, { status: 200 });
    }

    // Ignore if already processed (idempotency)
    if (transaction.status === 'completed') {
      return NextResponse.json({ status: 'already_processed' }, { status: 200 });
    }

    if (status === 'completed') {
      // Validation des montants et devises
      if (transaction.amount !== amount || transaction.currency !== currency) {
        structuredLog('error', 'naboopay.webhook.mismatch', { orderId, expectedAmount: transaction.amount, actualAmount: amount, expectedCurrency: transaction.currency, actualCurrency: currency });
        throw new BadRequestError('Montant ou devise incorrects', 'AMOUNT_MISMATCH');
      }
    }

    // Update the transaction status
    await tx.update(naboopayTransactions)
      .set({ 
        status: status, 
        payload: payload as unknown as Record<string, unknown>, 
        updatedAt: new Date().toISOString() 
      })
      .where(eq(naboopayTransactions.orderId, orderId));

    // If payment is completed, grant access
    if (status === 'completed') {
      const now = new Date();
      // Add 30 days for monthly, 365 days for annual
      const durationDays = transaction.planCode === 'lumina_all_access_annual' ? 365 : 30;
      const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      await tx.insert(subscriptions)
        .values({
          id: `sub_nbp_${orderId}`,
          userId: transaction.userId,
          provider: 'naboopay',
          providerSubscriptionId: orderId, // using order_id as the subscription reference
          planCode: transaction.planCode,
          status: 'active',
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: true,
        })
        .onConflictDoUpdate({
          target: [subscriptions.providerSubscriptionId],
          set: {
            status: 'active',
            currentPeriodEnd: periodEnd,
            updatedAt: now.toISOString(),
          }
        });
        
      structuredLog('info', 'naboopay.payment.completed', {
        orderId,
        userId: transaction.userId,
        planCode: transaction.planCode,
      });
    }

    return null;
  });

  if (result) return result;

  return NextResponse.json({ status: 'received' }, { status: 200 });
});
