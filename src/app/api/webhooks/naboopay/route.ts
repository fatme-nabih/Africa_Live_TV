import { verifyNabooPayWebhookSignature, NabooPayTransactionPayloadSchema } from '@/lib/naboopay';
import { db } from '@/db';
import { naboopayTransactions, subscriptions, naboopayWebhookEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { BadRequestError, UnauthorizedError, withApiErrorHandler } from '@/lib/api-errors';
import { structuredLog } from '@/lib/structured-log';
import { readBoundedJsonText } from '@/lib/bounded-json';
import crypto from 'crypto';

export const POST = withApiErrorHandler(async (request: Request) => {
  const signature = request.headers.get('X-Signature');
  if (!signature) {
    throw new UnauthorizedError('Signature manquante', 'MISSING_SIGNATURE');
  }

  // Limiter la taille du payload (ex: 64KB)
  const payloadStr = await readBoundedJsonText(request, 64 * 1024);
  const digest = crypto.createHash('sha256').update(payloadStr).digest('hex');

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(payloadStr);
  } catch {
    throw new BadRequestError('JSON invalide', 'INVALID_JSON');
  }

  const parseResult = NabooPayTransactionPayloadSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    throw new BadRequestError('Payload invalide', 'INVALID_PAYLOAD');
  }
  const payload = parseResult.data;

  const isValid = await verifyNabooPayWebhookSignature(payloadStr, signature);
  if (!isValid) {
    throw new UnauthorizedError('Signature invalide', 'INVALID_SIGNATURE');
  }

  const orderId = payload.order_id;
  const status = payload.transaction_status;
  const amount = payload.amount;
  const currency = payload.currency;

  const eventId = crypto.randomUUID();

  // Atomically process the webhook
  const result = await db.transaction(async (tx) => {
    // Prevent processing the same payload twice (idempotency by digest)
    const [existingEvent] = await tx.select().from(naboopayWebhookEvents).where(eq(naboopayWebhookEvents.payloadDigest, digest));
    if (existingEvent) {
      if (existingEvent.state === 'processed') {
        return NextResponse.json({ status: 'already_processed' }, { status: 200 });
      }
      // If failed or rejected, we could retry depending on logic, but here we just return error
    }

    // Insert the event as received
    await tx.insert(naboopayWebhookEvents).values({
      id: eventId,
      providerOrderId: orderId,
      payloadDigest: digest,
      providerStatus: status,
      providerCreatedAt: new Date(payload.created_at).toISOString(),
      state: 'received',
      sanitizedPayload: {
        order_id: payload.order_id,
        transaction_status: payload.transaction_status,
        amount: payload.amount,
        currency: payload.currency,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
        paid_at: payload.paid_at,
      },
    }).onConflictDoNothing();

    // Fetch the pending transaction with a lock
    const [transaction] = await tx.select().from(naboopayTransactions).where(eq(naboopayTransactions.providerOrderId, orderId)).for('update');
    
    if (!transaction) {
      structuredLog('warn', 'naboopay.webhook.unknown_order', { orderId });
      await tx.update(naboopayWebhookEvents).set({ state: 'rejected', errorCode: 'UNKNOWN_ORDER' }).where(eq(naboopayWebhookEvents.id, eventId));
      return NextResponse.json({ error: 'Commande inconnue', code: 'UNKNOWN_ORDER' }, { status: 400 });
    }

    // Ignore if already processed (local transaction idempotency)
    if (transaction.status === 'completed' || transaction.status === 'canceled' || transaction.status === 'failed') {
      await tx.update(naboopayWebhookEvents).set({ state: 'processed' }).where(eq(naboopayWebhookEvents.id, eventId));
      return NextResponse.json({ status: 'already_processed' }, { status: 200 });
    }

    if (status === 'completed') {
      // Validation des montants et devises
      if (transaction.amount !== amount || transaction.currency !== currency) {
        structuredLog('error', 'naboopay.webhook.mismatch', { orderId, expectedAmount: transaction.amount, actualAmount: amount, expectedCurrency: transaction.currency, actualCurrency: currency });
        await tx.update(naboopayWebhookEvents).set({ state: 'failed', errorCode: 'AMOUNT_MISMATCH' }).where(eq(naboopayWebhookEvents.id, eventId));
        return NextResponse.json({ error: 'Montant ou devise incorrects', code: 'AMOUNT_MISMATCH' }, { status: 400 });
      }
    }

    // Update the transaction status
    await tx.update(naboopayTransactions)
      .set({ 
        status: status, 
        providerStatus: status,
        updatedAt: new Date().toISOString(),
        paidAt: payload.paid_at ? new Date(payload.paid_at).toISOString() : null,
      })
      .where(eq(naboopayTransactions.providerOrderId, orderId));

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

    await tx.update(naboopayWebhookEvents).set({ state: 'processed' }).where(eq(naboopayWebhookEvents.id, eventId));

    return null; // Return null if successfully processed so we can return standard response
  });

  if (result) return result;

  return NextResponse.json({ status: 'received' }, { status: 200 });
});
