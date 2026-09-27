import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { db } from '@/db';
import { naboopayTransactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { ensureInternalUser } from '@/lib/identity';
import BrandWatermark from '@/components/BrandWatermark';

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
    <main className="relative min-h-screen bg-black px-5 py-20 text-zinc-100 flex flex-col items-center justify-center overflow-hidden">
      <BrandWatermark />
      <div className="relative z-10 mx-auto max-w-md w-full text-center rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-8 shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
          <XCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-white mb-3">Paiement non abouti</h1>
        <p className="text-zinc-400 mb-6 text-xs leading-relaxed">
          {errorMessage}
        </p>
        <Link
          href="/pricing"
          className="inline-block rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/20 via-amber-400/25 to-rose-500/20 hover:from-emerald-500/30 hover:via-amber-400/35 hover:to-rose-500/30 px-6 py-2.5 text-xs sm:text-sm font-bold text-amber-100 shadow-md backdrop-blur-md transition active:scale-[0.99]"
        >
          Retour aux offres
        </Link>
      </div>
    </main>
  );
}
