import { and, eq } from 'drizzle-orm';
import { db, pool } from '../db';
import { subscriptions, users, naboopayTransactions } from '../db/schema';
import { diagnosePaymentEntitlement } from '../lib/payment-entitlements';

async function run() {
  // Diagnostics are local by default. Remote account inspection is a separate operation.
  const target = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/africa_live_dev') throw new Error('LOCAL_DATABASE_REQUIRED');
  const accounts = await db.select({id:users.id,trialEndsAt:users.trialEndsAt,recordedEnd:subscriptions.currentPeriodEnd,recordedStart:subscriptions.currentPeriodStart})
    .from(users).innerJoin(subscriptions,and(eq(subscriptions.userId,users.id),eq(subscriptions.provider,'naboopay')));
  for (const account of accounts) {
    const purchases = await db.select().from(naboopayTransactions).where(eq(naboopayTransactions.userId,account.id));
    console.log(JSON.stringify({userId:account.id,...diagnosePaymentEntitlement(account.trialEndsAt,purchases,account.recordedEnd,account.recordedStart)}));
  }
}
run().catch(() => { console.error('Payment diagnostic failed.'); process.exitCode=1; }).finally(() => pool.end());
