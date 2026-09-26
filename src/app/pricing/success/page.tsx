import Link from 'next/link';
import { CheckCircle, Clock } from 'lucide-react';
import { db } from '@/db';
import { naboopayTransactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export default async function PricingSuccessPage(props: { searchParams: Promise<{ order_id?: string }> }) {
  const { userId } = await auth();
  const searchParams = await props.searchParams;
  const orderId = searchParams.order_id;
  
  if (!orderId || !userId) {
    return <ErrorState message="Identifiant de commande manquant ou utilisateur non authentifié." />;
  }

  const [tx] = await db.select().from(naboopayTransactions).where(eq(naboopayTransactions.orderId, orderId));

  if (!tx) {
    return <ErrorState message="Commande introuvable." />;
  }

  const isCompleted = tx.status === 'completed';

  return (
    <main className="min-h-screen bg-black px-5 py-20 text-zinc-100 flex flex-col items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        {isCompleted ? (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-yellow-400 mb-6" />
            <h1 className="text-3xl font-black text-white mb-4">Paiement Réussi !</h1>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Merci pour votre achat. Votre abonnement a bien été activé. Vous avez désormais un accès illimité à Africa Live TV.
            </p>
          </>
        ) : (
          <>
            <Clock className="mx-auto h-16 w-16 text-yellow-400 mb-6" />
            <h1 className="text-3xl font-black text-white mb-4">Paiement en cours</h1>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Votre paiement est en cours de validation. L&apos;accès à votre abonnement sera débloqué d&apos;ici quelques instants.
            </p>
          </>
        )}
        <Link
          href="/app"
          className="inline-block rounded-lg bg-yellow-400 px-6 py-3 text-sm font-black text-black transition hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
        >
          Ouvrir l&apos;application
        </Link>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-black px-5 py-20 text-zinc-100 flex flex-col items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-black text-white mb-4">Erreur de statut</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">{message}</p>
        <Link
          href="/pricing"
          className="inline-block rounded-lg bg-zinc-800 px-6 py-3 text-sm font-bold text-white transition hover:bg-zinc-700"
        >
          Retour aux offres
        </Link>
      </div>
    </main>
  );
}
