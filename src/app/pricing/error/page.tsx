import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { db } from '@/db';
import { naboopayTransactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export default async function PricingErrorPage(props: { searchParams: Promise<{ order_id?: string }> }) {
  const { userId } = await auth();
  const searchParams = await props.searchParams;
  const orderId = searchParams.order_id;
  
  let errorMessage = "Une erreur est survenue lors de votre paiement. Veuillez réessayer.";

  if (orderId && userId) {
    const [tx] = await db.select().from(naboopayTransactions).where(
      and(
        eq(naboopayTransactions.checkoutAttemptId, orderId),
        eq(naboopayTransactions.userId, userId)
      )
    );
    if (tx && tx.status === 'canceled') {
      errorMessage = "Le paiement a été annulé.";
    } else if (tx && tx.status === 'failed') {
      errorMessage = "Le paiement a échoué. Veuillez vérifier votre solde ou essayer avec un autre moyen de paiement.";
    }
  }

  return (
    <main className="min-h-screen bg-black px-5 py-20 text-zinc-100 flex flex-col items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-500 mb-6" />
        <h1 className="text-3xl font-black text-white mb-4">Paiement Échoué</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          {errorMessage}
        </p>
        <Link
          href="/pricing"
          className="inline-block rounded-lg bg-yellow-400 px-6 py-3 text-sm font-black text-black transition hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
        >
          Retour aux offres
        </Link>
      </div>
    </main>
  );
}
