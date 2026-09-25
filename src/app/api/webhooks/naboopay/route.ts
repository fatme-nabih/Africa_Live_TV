import { verifyNabooPayWebhookSignature, NabooPayTransactionPayload } from '@/lib/naboopay';
import { db } from '@/db';
import { naboopayTransactions, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { BadRequestError, UnauthorizedError, withApiErrorHandler } from '@/lib/api-errors';
import { structuredLog } from '@/lib/structured-log';

export const POST = withApiErrorHandler(async (request: Request) => {
  const signature = request.headers.get('X-Signature');
  if (!signature) {
    throw new UnauthorizedError('Signature manquante', 'MISSING_SIGNATURE');
  }

  const payloadStr = await request.text();
  let payload: NabooPayTransactionPayload;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    throw new BadRequestError('JSON invalide', 'INVALID_JSON');
  }

  const isValid = await verifyNabooPayWebhookSignature(payloadStr, signature);
  if (!isValid) {
    throw new UnauthorizedError('Signature invalide', 'INVALID_SIGNATURE');
  }

  const orderId = payload.order_id;
  const status = payload.transaction_status;

  // Fetch the pending transaction
  const [tx] = await db.select().from(naboopayTransactions).where(eq(naboopayTransactions.orderId, orderId));
  if (!tx) {
    structuredLog('warn', 'naboopay.webhook.unknown_order', { orderId });
    // Return 200 so NabooPay stops retrying
    return NextResponse.json({ status: 'ignored_unknown_order' }, { status: 200 });
  }

  // Ignore if already processed (idempotency)
  if (tx.status === 'completed') {
    return NextResponse.json({ status: 'already_processed' }, { status: 200 });
  }

  // Update the transaction status
  await db.update(naboopayTransactions)
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
    const durationDays = tx.planCode === 'lumina_all_access_annual' ? 365 : 30;
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // We use a simplified subscription model for NabooPay one-off payments
    await db.insert(subscriptions)
      .values({
        id: `sub_nbp_${orderId}`,
        userId: tx.userId,
        provider: 'naboopay',
        providerSubscriptionId: orderId, // using order_id as the subscription reference
        planCode: tx.planCode,
        status: 'active', // 'active' with a currentPeriodEnd will work properly with access-policy
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: true, // It does not auto-renew natively
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
      userId: tx.userId,
      planCode: tx.planCode,
    });
  }

  return NextResponse.json({ status: 'received' }, { status: 200 });
});
