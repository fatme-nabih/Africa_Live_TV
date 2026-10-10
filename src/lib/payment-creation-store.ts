import { and, eq, inArray, asc } from 'drizzle-orm';
import { db } from '@/db';
import { naboopayTransactions, users } from '@/db/schema';
export async function reservePaymentCreation(values:typeof naboopayTransactions.$inferInsert) {
  return db.transaction(async tx=>{
    const [user]=await tx.select({id:users.id}).from(users).where(eq(users.id,values.userId)).for('update');
    if(!user) throw new Error('USER_NOT_FOUND');
    const [sameKey]=await tx.select().from(naboopayTransactions).where(and(eq(naboopayTransactions.userId,values.userId),eq(naboopayTransactions.idempotencyKey,values.idempotencyKey)));
    if(sameKey) return {created:false,transaction:sameKey};
    const [uncertain]=await tx.select().from(naboopayTransactions).where(and(eq(naboopayTransactions.userId,values.userId),inArray(naboopayTransactions.status,['creating','pending','reconciliation_required']))).orderBy(asc(naboopayTransactions.createdAt)).limit(1);
    if(uncertain)return {created:false,transaction:uncertain};
    const [transaction]=await tx.insert(naboopayTransactions).values(values).returning();
    return {created:true,transaction};
  });
}
