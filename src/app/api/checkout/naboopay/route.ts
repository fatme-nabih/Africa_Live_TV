import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { naboopayTransactions } from '@/db/schema';
import { createNabooPayTransaction, NabooPayApiError } from '@/lib/naboopay';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { readBoundedJson } from '@/lib/bounded-json';
import { BadRequestError, UnauthorizedError, ServiceUnavailableError, RateLimitError, withApiErrorHandler } from '@/lib/api-errors';
import { ensureInternalUser } from '@/lib/identity';
import { consumeRateLimit } from '@/lib/rate-limit';

const checkoutSchema = z.object({
  planCode: z.enum(['lumina_all_access_monthly', 'lumina_all_access_annual']),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, "Numéro de téléphone non conforme E.164"),
  idempotencyKey: z.string().min(1),
}).strict();

export const POST = withApiErrorHandler(async (request: Request) => {
  const { userId } = await auth();
  if (!userId) {
    throw new UnauthorizedError('Authentification requise.');
  }

  const internalUser = await ensureInternalUser(userId);
  if (internalUser.status === 'blocked' || internalUser.status === 'deleted') {
    throw new UnauthorizedError('Utilisateur bloqué ou supprimé.');
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

  const body = await readBoundedJson(request, 8 * 1_024);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError('Données de paiement invalides.', 'INVALID_PAYLOAD');
  }

  const { planCode, phone, idempotencyKey } = parsed.data;
  const amount = planCode === 'lumina_all_access_annual' ? 9900 : 990;

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
    });
  }

  const id = crypto.randomUUID();
  const checkoutAttemptId = crypto.randomUUID().replace(/-/g, '');

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const successUrl = `${origin}/pricing/success?order_id=${checkoutAttemptId}`;
  const errorUrl = `${origin}/pricing/error?order_id=${checkoutAttemptId}`;

  // Create local intention
  await db.insert(naboopayTransactions).values({
    id,
    checkoutAttemptId,
    idempotencyKey,
    userId: internalUser.id,
    planCode,
    amount,
    currency: 'XOF',
    status: 'creating',
    payload: {},
  });

  let nbpResponse;
  try {
    nbpResponse = await createNabooPayTransaction({
      method_of_payment: ['wave', 'orange_money', 'visa', 'mastercard'],
      products: [
        {
          name: `Abonnement ${planCode === 'lumina_all_access_annual' ? 'Annuel' : 'Mensuel'} Africa Live`,
          price: amount,
          quantity: 1,
          description: 'Accès illimité aux chaînes Africa Live TV',
        },
      ],
      customer: {
        first_name: internalUser.email?.split('@')[0] || 'Client',
        last_name: 'AfricaLive',
        phone: phone, 
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
    status: 'pending'
  });
});
