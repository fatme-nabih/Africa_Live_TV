import { XCircle } from 'lucide-react';
import { db } from '@/db';
import { naboopayTransactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { ensureInternalUser } from '@/lib/identity';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import { ButtonLink } from '@/components/ui';

export default async function PricingErrorPage(props: { searchParams: Promise<{ order_id?: string }> }) {
  const { userId } = await auth();
  const searchParams = await props.searchParams;
  const orderId = searchParams.order_id;
  
  let errorMessage = "Une erreur est survenue lors de votre paiement. Veuillez réessayer.";

  if (orderId && userId) {
    const internalUser = await ensureInternalUser(userId);
    const [tx] = await db.select().from(naboopayTransactions).where(
      and(
        eq(naboopayTransactions.checkoutAttemptId, orderId),
        eq(naboopayTransactions.userId, internalUser.id)
      )
    );
    if (tx && tx.status === 'canceled') {
      errorMessage = "Le paiement a été annulé.";
    } else if (tx && tx.status === 'failed') {
      errorMessage = "Le paiement a échoué. Veuillez vérifier votre solde ou essayer avec un autre moyen de paiement.";
    }
  }

  return (
    <main className="relative min-h-screen bg-black px-5 py-20 text-text flex flex-col items-center justify-center overflow-hidden">
      <BrandBackdrop variant="app" />
      <div className="relative z-10 mx-auto max-w-md w-full text-center rounded-2xl border border-line bg-surface-1/80 p-8 shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-al-red/20 bg-al-red/10 text-al-red-soft">
          <XCircle className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold text-text mb-3">Paiement non abouti</h1>
        <p className="text-text-muted mb-6 text-xs leading-relaxed">
          {errorMessage}
        </p>
        <ButtonLink href="/pricing" variant="primary">
          Retour aux offres
        </ButtonLink>
      </div>
    </main>
  );
}
