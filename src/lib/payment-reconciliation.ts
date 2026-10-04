import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { naboopayTransactions } from '@/db/schema';

export async function claimPaymentReconciliation(now = new Date(), limit = 100) {
  const cutoff = new Date(now.getTime() - 60 * 60_000).toISOString();
  // Unknown creations cannot use the documented lookup. They are tracked
  // separately and never take slots from identifiable orders.
  await db.update(naboopayTransactions).set({ status:'reconciliation_required' }).where(and(
    eq(naboopayTransactions.status,'creating'), isNull(naboopayTransactions.providerOrderId), lt(naboopayTransactions.updatedAt,cutoff)));
  const ambiguous = await db.select({ count:sql<number>`count(*)::int` }).from(naboopayTransactions).where(and(
    eq(naboopayTransactions.status,'reconciliation_required'),isNull(naboopayTransactions.providerOrderId)));
  // updated_at is the durable operational lease, separate from provider_updated_at.
  // A crash makes the order due again within an hour; no SQL transaction spans HTTP.
  const claimed = await db.execute<{ id: string; provider_order_id: string }>(sql`
    with due as (
      select id from ${naboopayTransactions}
      where provider_order_id is not null and updated_at <= ${cutoff}::timestamptz
        and (status in ('creating','pending','reconciliation_required') or (status='completed' and fulfilled_at is null))
      order by updated_at, id limit ${limit} for update skip locked
    )
    update ${naboopayTransactions} t set updated_at=${now.toISOString()}::timestamptz
    from due where t.id=due.id returning t.id,t.provider_order_id
  `);
  return { orders:claimed.rows, ambiguousCreations:ambiguous[0]?.count ?? 0 };
}
