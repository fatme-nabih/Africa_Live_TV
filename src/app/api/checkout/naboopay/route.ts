import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { naboopayTransactions } from '@/db/schema';
import { createNabooPayTransaction } from '@/lib/naboopay';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

const checkoutSchema = z.object({
  planCode: z.enum(['lumina_all_access_monthly', 'lumina_all_access_annual']),
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid plan code' }, { status: 400 });
    }

    const { planCode } = parsed.data;
    const amount = planCode === 'lumina_all_access_annual' ? 9900 : 990;
    const orderId = `nbp_${crypto.randomUUID().replace(/-/g, '')}`;

    const user = await currentUser();
    const firstName = user?.firstName || 'Utilisateur';
    const lastName = user?.lastName || 'AfricaLive';

    // Construire les URLs de redirection
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const successUrl = `${origin}/pricing/success?order_id=${orderId}`;
    const errorUrl = `${origin}/pricing/error?order_id=${orderId}`;

    // Appeler NabooPay
    const nbpResponse = await createNabooPayTransaction({
      method_of_payment: ['wave', 'orange_money', 'visa', 'mastercard'],
      products: [
        {
          name: `Abonnement ${planCode === 'lumina_all_access_annual' ? 'Annuel' : 'Mensuel'} Africa Live`,
          category: 'Abonnement',
          amount: amount,
          quantity: 1,
          description: 'Accès illimité aux chaînes Africa Live TV',
        },
      ],
      success_url: successUrl,
      error_url: errorUrl,
      fees_customer_side: true,
    });

    if (!nbpResponse.checkout_url) {
      throw new Error('NabooPay response missing checkout_url');
    }

    // Enregistrer la transaction en attente dans notre DB
    await db.insert(naboopayTransactions).values({
      orderId: nbpResponse.order_id || orderId, // Use their order_id if they return it, else ours
      userId: userId,
      planCode: planCode,
      amount: amount,
      status: 'pending',
      payload: {},
    });

    return NextResponse.json({ checkout_url: nbpResponse.checkout_url });

  } catch (error) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
