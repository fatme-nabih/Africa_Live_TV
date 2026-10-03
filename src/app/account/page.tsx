import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserProfile } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { CreditCard, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

import { getCurrentAccessDecision } from '@/lib/access-control';
import AppShell from '@/components/shell/AppShell';
import EcoToggle from '@/components/shell/EcoToggle';
import { getAdministratorAccess } from '@/lib/admin-access';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import { ButtonLink } from '@/components/ui';

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
    <AppShell admin={isAdmin}>
    <main className="relative flex-1 bg-black px-5 py-8 text-text overflow-hidden">
      <BrandBackdrop variant="app" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Access required notice banner */}
        {isAccessRequired && !decision.hasAccess && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-al-gold/30 bg-al-gold/10 p-4 text-xs text-text">
            <AlertCircle size={18} className="text-al-gold shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-text">Abonnement ou période d&apos;essai requis</p>
              <p className="mt-1 leading-relaxed text-text">
                Votre compte ne dispose plus d&apos;un accès actif. Vous pouvez toujours consulter le catalogue TV ; un abonnement est nécessaire pour accéder au dashboard et lancer une source.
              </p>
              <Link
                href="/pricing"
                className="mt-3 inline-flex items-center gap-1.5 font-bold text-al-gold hover:text-text transition"
              >
                <span>Souscrire dès 990 FCFA (Wave, Orange Money & CB)</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-2xl border border-line bg-surface-1/80 p-6 shadow-xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-al-gold">Compte</p>
                <h1 className="font-display mt-2 text-2xl font-bold text-text">Mon accès</h1>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-al-gold/20 bg-al-gold/10 text-al-gold">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-text-muted">Statut</dt>
                <dd className="mt-1.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold ${decision.hasAccess ?'bg-al-green/15 border border-al-green/30 text-al-green' : 'bg-al-red/15 border border-al-red/30 text-al-red-soft'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${decision.hasAccess ?'bg-al-green' : 'bg-al-red'}`} />
                    {formatStatus(decision.status, decision.reason)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-text-muted">Plan</dt>
                <dd className="mt-1 text-xs font-medium text-text">
                  {isAdmin
                    ? 'Accès Administrateur Illimité'
                    : (currentSubscription?.planCode ?? 'all_access')}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-text-muted">Email</dt>
                <dd className="mt-1 text-xs font-medium text-text">{user?.email ?? 'Non renseigné'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-text-muted">Échéance</dt>
                <dd className="mt-1 text-xs font-medium text-text">
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
                <ButtonLink href="/pricing" variant="primary" block icon={<Sparkles size={14} aria-hidden="true" />}>
                  <span>Activer mon abonnement (dès 990 FCFA)</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </ButtonLink>
              </div>
            )}

            <div className="mt-8 rounded-xl border border-line bg-surface-2 p-4">
              <EcoToggle variant="switch" />
            </div>

            <div className="mt-4 rounded-xl border border-line bg-surface-1/80 p-4">
              <div className="flex gap-3">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-al-gold" />
                <p className="text-xs leading-relaxed text-text-muted">
                  Votre abonnement est géré de manière sécurisée via NabooPay. L&apos;accès Africa Live est mis à jour instantanément après votre paiement.
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-line bg-surface-1/80 p-3 shadow-xl shadow-black/40">
            <UserProfile routing="hash" />
          </section>
        </div>
      </div>
    </main>
    </AppShell>
  );
}
