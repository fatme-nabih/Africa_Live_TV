import { HelpCircle, Wallet } from 'lucide-react';
import { db } from '@/db';
import { naboopayTransactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { ensureInternalUser } from '@/lib/identity';
import OffAirScreen from '@/components/brand/OffAirScreen';
import { ButtonLink } from '@/components/ui';

export default async function PricingErrorPage(props: { searchParams: Promise<{ order_id?: string }> }) {
  const searchParams = await props.searchParams;
  const orderId = searchParams.order_id;
  // The generic public message needs no account lookup. Any order-specific
  // information still requires Clerk and the owning internal account below.
  const userId = orderId ? (await auth()).userId : null;
  
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
    <OffAirScreen
      illustration="acacia"
      title="Paiement non abouti"
      description={errorMessage}
      actions={(
        <>
          <ButtonLink href="/pricing" variant="primary" icon={<Wallet size={16} aria-hidden="true" />}>
            Retour aux offres
          </ButtonLink>
          <ButtonLink href="/contact" variant="ghost" icon={<HelpCircle size={16} aria-hidden="true" />}>
            Besoin d’aide ?
          </ButtonLink>
        </>
      )}
    />
  );
}
