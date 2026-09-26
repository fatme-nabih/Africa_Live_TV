import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { naboopayTransactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { UnauthorizedError, NotFoundError, withApiErrorHandler } from '@/lib/api-errors';

export const GET = withApiErrorHandler(async (request: Request) => {
  const { userId } = await auth();
  if (!userId) {
    throw new UnauthorizedError('Authentification requise.');
  }

  const { searchParams } = new URL(request.url);
  const checkoutAttemptId = searchParams.get('checkout_attempt_id');

  if (!checkoutAttemptId) {
    throw new NotFoundError('Paramètre manquant');
  }

  const tx = await db.query.naboopayTransactions.findFirst({
    where: and(
      eq(naboopayTransactions.checkoutAttemptId, checkoutAttemptId),
      // Prevent users from querying other users' transactions
      eq(naboopayTransactions.userId, userId)
    ),
    columns: {
      status: true,
      checkoutAttemptId: true,
      amount: true,
      currency: true,
      planCode: true
    }
  });

  if (!tx) {
    throw new NotFoundError('Transaction introuvable');
  }

  return NextResponse.json({
    status: tx.status,
    checkout_attempt_id: tx.checkoutAttemptId,
    plan: tx.planCode,
    amount: tx.amount,
    currency: tx.currency
  });
});
