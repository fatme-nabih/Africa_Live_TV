import { verifyNabooPayWebhookSignature, NabooPayTransactionPayload } from '@/lib/naboopay';
import { db } from '@/db';
import { naboopayTransactions, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('X-Signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const payloadStr = await request.text();
    let payload: NabooPayTransactionPayload;
    try {
      payload = JSON.parse(payloadStr);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const isValid = await verifyNabooPayWebhookSignature(payloadStr, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const orderId = payload.order_id;
    const status = payload.transaction_status;

    // Fetch the pending transaction
    const [tx] = await db.select().from(naboopayTransactions).where(eq(naboopayTransactions.orderId, orderId));
    if (!tx) {
      console.warn(`Webhook received for unknown order: ${orderId}`);
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
        payload: payload as any, 
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
    }

    return NextResponse.json({ status: 'received' }, { status: 200 });

  } catch (error) {
    console.error('NabooPay Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
