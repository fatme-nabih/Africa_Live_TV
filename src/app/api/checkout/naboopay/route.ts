import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { naboopayTransactions } from '@/db/schema';
import { createNabooPayTransaction } from '@/lib/naboopay';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { readBoundedJson } from '@/lib/bounded-json';
import { BadRequestError, UnauthorizedError, ServiceUnavailableError, RateLimitError, withApiErrorHandler } from '@/lib/api-errors';
import { ensureInternalUser } from '@/lib/identity';
import { consumeRateLimit } from '@/lib/rate-limit';

const checkoutSchema = z.object({
  planCode: z.enum(['lumina_all_access_monthly', 'lumina_all_access_annual']),
});

export const POST = withApiErrorHandler(async (request: Request) => {
  const { userId } = await auth();
  if (!userId) {
    throw new UnauthorizedError('Authentification requise.');
  }

  const internalUser = await ensureInternalUser(userId);

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
    throw new BadRequestError('Le forfait sélectionné est invalide.', 'INVALID_PLAN_CODE');
  }

  const { planCode } = parsed.data;
  const amount = planCode === 'lumina_all_access_annual' ? 9900 : 990;
  const checkoutAttemptId = crypto.randomUUID().replace(/-/g, '');

  // Construire les URLs de redirection
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const successUrl = `${origin}/pricing/success?order_id=${checkoutAttemptId}`;
  const errorUrl = `${origin}/pricing/error?order_id=${checkoutAttemptId}`;

  // Enregistrer la transaction en attente dans notre DB avant l'appel externe
  await db.insert(naboopayTransactions).values({
    orderId: checkoutAttemptId,
    checkoutAttemptId: checkoutAttemptId,
    userId: internalUser.id,
    planCode: planCode,
    amount: amount,
    currency: 'XOF',
    status: 'pending',
    payload: {},
  });

  // Appeler NabooPay
  const nbpResponse = await createNabooPayTransaction({
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
      phone: '', 
      created_at: internalUser.createdAt
    },
    success_url: successUrl,
    error_url: errorUrl,
    fees_customer_side: true,
  }, checkoutAttemptId);

  if (!nbpResponse.checkout_url) {
    throw new ServiceUnavailableError('La plateforme de paiement NabooPay ne répond pas correctement.', 'NABOOPAY_UNAVAILABLE');
  }

  return NextResponse.json({ checkout_url: nbpResponse.checkout_url });
});
