import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserProfile } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { CreditCard, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

import { getCurrentAccessDecision } from '@/lib/access-control';
import AppNavigation, { AppBrand, NavigationProvider } from '@/components/AppNavigation';
import { getAdministratorAccess } from '@/lib/admin-access';
import BrandWatermark from '@/components/BrandWatermark';

function formatStatus(status: string, reason?: string) {
  if (reason === 'administrator_access') return 'Actif (Administrateur)';
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

export default async function AccountPage(props: {
  searchParams?: Promise<{ access?: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in?redirect_url=/account');
  }

  const searchParams = props.searchParams ? await props.searchParams : {};
  const isAccessRequired = searchParams.access === 'required';

  const { user, decision, subscriptions } = await getCurrentAccessDecision();
  const currentSubscription = subscriptions[0];
  const admin = await getAdministratorAccess();
  const isAdmin = admin.allowed;

  return (
    <main className="relative min-h-screen bg-black px-5 py-8 text-zinc-100 overflow-hidden">
      <BrandWatermark />

      <div className="relative z-10 mx-auto max-w-6xl">
        <nav className="mb-8 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-5">
          <AppBrand />
          <NavigationProvider admin={isAdmin}><AppNavigation /></NavigationProvider>
        </nav>

        {/* Access required notice banner */}
        {isAccessRequired && !decision.hasAccess && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-200 backdrop-blur-xl">
            <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-white">Abonnement ou période d&apos;essai requis</p>
              <p className="mt-1 leading-relaxed text-zinc-300">
                Votre compte ne dispose plus d&apos;un accès actif. Vous pouvez toujours consulter le catalogue TV ; un abonnement est nécessaire pour accéder au dashboard et lancer une source.
              </p>
              <Link
                href="/pricing"
                className="mt-3 inline-flex items-center gap-1.5 font-bold text-amber-300 hover:text-white transition"
              >
                <span>Souscrire dès 990 FCFA (Wave, Orange Money & CB)</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 shadow-xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Compte</p>
                <h1 className="mt-2 text-2xl font-black text-white">Mon accès</h1>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Statut</dt>
                <dd className="mt-1.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold ${decision.hasAccess ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${decision.hasAccess ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {formatStatus(decision.status, decision.reason)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Plan</dt>
                <dd className="mt-1 text-xs font-medium text-zinc-200">
                  {isAdmin
                    ? 'Accès Administrateur Illimité'
                    : (currentSubscription?.planCode ?? 'all_access')}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Email</dt>
                <dd className="mt-1 text-xs font-medium text-zinc-200">{user?.email ?? 'Non renseigné'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Échéance</dt>
                <dd className="mt-1 text-xs font-medium text-zinc-200">
                  {isAdmin
                    ? 'Accès permanent'
                    : decision.expiresAt
                      ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(decision.expiresAt))
                      : 'Sans échéance connue'}
                </dd>
              </div>
            </dl>

            {!decision.hasAccess && (
              <div className="mt-6">
                <Link
                  href="/pricing"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/25 via-amber-400/30 to-rose-500/25 hover:from-emerald-500/35 hover:via-amber-400/40 hover:to-rose-500/35 py-2.5 text-xs sm:text-sm font-bold text-amber-100 shadow-md backdrop-blur-md transition active:scale-[0.99]"
                >
                  <Sparkles size={14} className="text-amber-300" />
                  <span>Activer mon abonnement (dès 990 FCFA)</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}

            <div className="mt-8 rounded-xl border border-white/[0.08] bg-black/50 p-4">
              <div className="flex gap-3">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs leading-relaxed text-zinc-400">
                  Votre abonnement est géré de manière sécurisée via NabooPay. L&apos;accès Africa Live est mis à jour instantanément après votre paiement.
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-3 shadow-xl shadow-black/40">
            <UserProfile routing="hash" />
          </section>
        </div>
      </div>
    </main>
  );
}
