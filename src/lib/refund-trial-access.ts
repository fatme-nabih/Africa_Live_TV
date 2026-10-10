import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { naboopayTransactions, subscriptions, users } from '@/db/schema';
import { evaluateAccess } from './access-policy';

// Server-derived proof only. No browser flag can reach this policy context.
export async function evaluateUserAccess(user: typeof users.$inferSelect, rows: (typeof subscriptions.$inferSelect)[], now = new Date()) {
  const standard = evaluateAccess(user, rows, now);
  if (standard.hasAccess || standard.status !== 'expired' || Date.parse(user.trialEndsAt) <= now.getTime() ||
    rows.some(row => row.provider !== 'naboopay' || row.status !== 'expired')) return standard;
  const [proof] = await db.select({
    completed: sql<number>`count(*) filter (where ${naboopayTransactions.status} = 'completed')::int`,
    refunded: sql<number>`count(*) filter (where ${naboopayTransactions.status} = 'refunded' and ${naboopayTransactions.providerStatus} = 'refunded' and ${naboopayTransactions.providerUpdatedAt} is not null and ${naboopayTransactions.fulfilledAt} is not null)::int`,
  }).from(naboopayTransactions).where(eq(naboopayTransactions.userId, user.id));
  return evaluateAccess(user, rows, now, { verifiedNabooPayRefundWithoutCompletedPurchase: proof.completed === 0 && proof.refunded > 0 });
}
