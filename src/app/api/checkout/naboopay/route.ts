import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { naboopayTransactions } from '@/db/schema';
import { createNabooPayTransaction, NabooPayApiError } from '@/lib/naboopay';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { readBoundedJson } from '@/lib/bounded-json';
import { BadRequestError, UnauthorizedError, ServiceUnavailableError, RateLimitError, withApiErrorHandler } from '@/lib/api-errors';
import { ensureInternalUser } from '@/lib/identity';
import { consumeRateLimit } from '@/lib/rate-limit';
import { NABOOPAY_PLANS } from '@/lib/naboopay-payment';
import { checkoutRequestSchema } from '@/lib/payment-contracts';

export const POST = withApiErrorHandler(async (request: Request) => {
  if (process.env.PAYMENTS_ENABLED !== 'true') {
    throw new ServiceUnavailableError('Le paiement est temporairement indisponible.', 'PAYMENTS_DISABLED');
  }
  const { userId } = await auth();
  if (!userId) {
    throw new UnauthorizedError('Authentification requise.');
  }

  const internalUser = await ensureInternalUser(userId);
  if (internalUser.status === 'blocked' || internalUser.status === 'deleted') {
    throw new UnauthorizedError('Utilisateur bloqué ou supprimé.');
  }

  const body = await readBoundedJson(request, 8 * 1_024);
  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError('Données de paiement invalides.', 'INVALID_PAYLOAD');
  }

  const { planCode, firstName, lastName, phone, idempotencyKey } = parsed.data;
  const plan = NABOOPAY_PLANS[planCode];
  const amount = plan.amount;

  // Implémenter l’idempotence locale
  const existingTx = await db.query.naboopayTransactions.findFirst({
    where: and(
      eq(naboopayTransactions.userId, internalUser.id),
      eq(naboopayTransactions.idempotencyKey, idempotencyKey)
    ),
  });

  if (existingTx) {
    if (existingTx.planCode !== planCode) {
      throw new BadRequestError('Une tentative avec cette clé existe déjà pour un forfait différent.', 'IDEMPOTENCY_CONFLICT');
    }
    // Return the existing transaction
    return NextResponse.json({
      checkout_url: existingTx.checkoutUrl || null,
      status: existingTx.status,
      checkout_attempt_id: existingTx.checkoutAttemptId,
    });
  }

  const rateLimit = await consumeRateLimit({
    bucket: 'naboopay_checkout',
    userId: internalUser.id,
    limit: 5,
    windowSeconds: 600,
  });

  if (!rateLimit.allowed) {
    throw new RateLimitError('Trop de tentatives de paiement. Réessayez dans quelques instants.', 'RATE_LIMITED', {
      'X-RateLimit-Limit': String(rateLimit.limit),
      'X-RateLimit-Remaining': '0',
    });
  }

  const id = crypto.randomUUID();
  const checkoutAttemptId = crypto.randomUUID().replace(/-/g, '');

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const successUrl = `${origin}/pricing/success?order_id=${checkoutAttemptId}`;
  const errorUrl = `${origin}/pricing/error?order_id=${checkoutAttemptId}`;

  // The unique (user, idempotency key) constraint arbitrates concurrent requests.
  const [created] = await db.insert(naboopayTransactions).values({
    id,
    checkoutAttemptId,
    idempotencyKey,
    userId: internalUser.id,
    planCode,
    amount,
    currency: 'XOF',
    status: 'creating',
    payload: {},
  }).onConflictDoNothing().returning({ id: naboopayTransactions.id });

  if (!created) {
    const winner = await db.query.naboopayTransactions.findFirst({
      where: and(
        eq(naboopayTransactions.userId, internalUser.id),
        eq(naboopayTransactions.idempotencyKey, idempotencyKey),
      ),
    });
    if (!winner) throw new ServiceUnavailableError('Tentative de paiement indisponible.', 'CHECKOUT_CONFLICT');
    if (winner.planCode !== planCode) {
      throw new BadRequestError('Une tentative avec cette clé existe déjà pour un forfait différent.', 'IDEMPOTENCY_CONFLICT');
    }
    return NextResponse.json({
      checkout_url: winner.checkoutUrl,
      status: winner.status,
      checkout_attempt_id: winner.checkoutAttemptId,
    });
  }

  let nbpResponse;
  try {
    nbpResponse = await createNabooPayTransaction({
      method_of_payment: ['wave', 'orange_money', 'visa', 'mastercard'],
      products: [
        {
          name: plan.productName,
          price: amount,
          quantity: 1,
          description: 'Abonnement Africa Live : accès à l’application et au lancement des sources compatibles pendant la période souscrite.',
        },
      ],
      customer: {
        first_name: firstName,
        last_name: lastName,
        phone,
        created_at: internalUser.createdAt
      },
      success_url: successUrl,
      error_url: errorUrl,
      fees_customer_side: true,
    });
  } catch (error) {
    if (error instanceof NabooPayApiError && error.type === 'timeout') {
      await db.update(naboopayTransactions).set({ status: 'reconciliation_required' }).where(eq(naboopayTransactions.id, id));
    } else {
      await db.update(naboopayTransactions).set({ status: 'failed' }).where(eq(naboopayTransactions.id, id));
    }
    throw error;
  }

  if (!nbpResponse.checkout_url) {
    await db.update(naboopayTransactions).set({ status: 'failed' }).where(eq(naboopayTransactions.id, id));
    throw new ServiceUnavailableError('La plateforme de paiement NabooPay ne répond pas correctement.', 'NABOOPAY_UNAVAILABLE');
  }

  // Atomically update transaction
  await db.update(naboopayTransactions).set({
    providerOrderId: nbpResponse.order_id,
    checkoutUrl: nbpResponse.checkout_url,
    status: 'pending'
  }).where(eq(naboopayTransactions.id, id));

  return NextResponse.json({
    checkout_url: nbpResponse.checkout_url,
    status: 'pending',
    checkout_attempt_id: checkoutAttemptId,
  });
});
