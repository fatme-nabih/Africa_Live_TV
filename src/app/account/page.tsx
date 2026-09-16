import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserProfile } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { CreditCard, ShieldCheck } from 'lucide-react';

import { getCurrentAccessDecision } from '@/lib/access-control';

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    active: 'Actif',
    trial: 'Essai actif',
    grace: 'Délai de grâce',
    expired: 'Expiré',
    past_due: 'Paiement requis',
    blocked: 'Bloqué',
  };

  return labels[status] ?? status;
}

export default async function AccountPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in?redirect_url=/account');
  }

  const { user, decision, subscriptions } = await getCurrentAccessDecision();
  const currentSubscription = subscriptions[0];

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-bold text-zinc-300 transition hover:text-yellow-200">
            Africa Live
          </Link>
          <Link
            href="/app"
            className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-black text-black transition hover:bg-yellow-300"
          >
            Ouvrir l app
          </Link>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">Compte</p>
                <h1 className="mt-3 text-3xl font-black text-white">Mon acces</h1>
              </div>
              <ShieldCheck className="h-7 w-7 text-yellow-300" />
            </div>

            <dl className="mt-8 space-y-5">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Statut</dt>
                <dd className="mt-2">
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${decision.hasAccess ? 'bg-green-400/10 text-green-300' : 'bg-red-400/10 text-red-300'}`}>
                    {formatStatus(decision.status)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Plan</dt>
                <dd className="mt-2 text-sm font-semibold text-zinc-200">{currentSubscription?.planCode ?? 'all_access'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Email</dt>
                <dd className="mt-2 text-sm font-semibold text-zinc-200">{user?.email ?? 'Non renseigné'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Échéance</dt>
                <dd className="mt-2 text-sm font-semibold text-zinc-200">
                  {decision.expiresAt
                    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(decision.expiresAt))
                    : 'Sans échéance connue'}
                </dd>
              </div>
            </dl>

            <div className="mt-8 rounded-lg border border-zinc-800 bg-black p-4">
              <div className="flex gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
                <p className="text-sm leading-6 text-zinc-400">
                  L abonnement est géré dans le profil Clerk ci-contre. Les achats de cette
                  instance utilisent le mode test ; l accès Lumina est mis à jour par des
                  webhooks signés.
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-2">
            <UserProfile routing="hash" />
          </section>
        </div>
      </div>
    </main>
  );
}
